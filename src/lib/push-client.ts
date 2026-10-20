export type PushStatus =
  | "unsupported"
  | "ios-needs-install"
  | "blocked"
  | "not-enabled"
  | "enabled";

function isIosDevice() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function isStandalone() {
  return window.matchMedia("(display-mode: standalone)").matches ||
    ("standalone" in navigator && Boolean((navigator as Navigator & { standalone?: boolean }).standalone));
}

export async function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return null;
  return navigator.serviceWorker.register("/sw.js", { scope: "/" });
}

export async function getPushStatus(): Promise<PushStatus> {
  if (typeof window === "undefined" || !("Notification" in window) || !("serviceWorker" in navigator) || !("PushManager" in window)) {
    return "unsupported";
  }
  if (isIosDevice() && !isStandalone()) return "ios-needs-install";
  if (Notification.permission === "denied") return "blocked";
  if (Notification.permission !== "granted") return "not-enabled";
  const registration = await navigator.serviceWorker.getRegistration("/");
  const subscription = await registration?.pushManager.getSubscription();
  return subscription ? "enabled" : "not-enabled";
}

function decodeVapidKey(encoded: string) {
  const padding = "=".repeat((4 - encoded.length % 4) % 4);
  const base64 = (encoded + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  return Uint8Array.from(raw, (char) => char.charCodeAt(0));
}

export async function enablePush() {
  if (typeof window === "undefined" || !("Notification" in window)) return { error: "This browser doesn't support notifications." };
  const permission = await Notification.requestPermission();
  if (permission !== "granted") return { error: permission === "denied" ? "Notifications are blocked in this browser." : "Notifications weren't allowed." };
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!publicKey) return { error: "Push notifications aren't configured yet." };

  try {
    const registration = await registerServiceWorker();
    if (!registration) return { error: "This browser can't register notifications." };
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: decodeVapidKey(publicKey),
    });
    const response = await fetch("/api/push/subscribe", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(subscription.toJSON()),
    });
    if (!response.ok) {
      await subscription.unsubscribe();
      return { error: "Couldn't save this device. Try again." };
    }
    return {};
  } catch {
    return { error: "Couldn't turn on notifications. Try again." };
  }
}

export async function disablePush() {
  try {
    const registration = await navigator.serviceWorker.getRegistration("/");
    const subscription = await registration?.pushManager.getSubscription();
    if (!subscription) return {};
    const endpoint = subscription.endpoint;
    const response = await fetch("/api/push/unsubscribe", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ endpoint }),
    });
    if (!response.ok) return { error: "Couldn't remove this device. Try again." };
    const unsubscribed = await subscription.unsubscribe();
    if (!unsubscribed) return { error: "Couldn't turn off notifications on this device." };
    return {};
  } catch {
    return { error: "Couldn't turn off notifications. Try again." };
  }
}
