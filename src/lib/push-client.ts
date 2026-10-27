import {
  PUSH_PUBLIC_KEY_ENV,
  PUSH_PRIVATE_KEY_ENV,
  PUSH_SUBJECT_ENV,
  PUSH_SERVICE_ROLE_ENV,
  PUSH_DISPATCH_SECRET_ENV,
} from "@/lib/push-settings";

export type PushStatus =
  | "unsupported"
  | "ios-needs-install"
  | "blocked"
  | "not-enabled"
  | "enabled";

/**
 * The browser only ever sees the public key, and only when the build inlined
 * this exact literal expression. Dynamic access or destructuring would fall
 * back to an empty runtime `process.env`, so this stays a literal read.
 */
export function pushPublicKey() {
  return process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";
}

/** "Configured" on the client means one thing: the public key exists. */
export function pushPublicKeyPresent() {
  return pushPublicKey().trim().length > 0;
}

export const PUSH_PUBLIC_KEY_SETTING = PUSH_PUBLIC_KEY_ENV;

/** Server settings the client may name (never read) in a debug line. */
export const PUSH_SERVER_SETTING_NAMES = [
  PUSH_PRIVATE_KEY_ENV,
  PUSH_SUBJECT_ENV,
  PUSH_SERVICE_ROLE_ENV,
  PUSH_DISPATCH_SECRET_ENV,
] as const;

function isIosDevice() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function isStandalone() {
  return window.matchMedia("(display-mode: standalone)").matches ||
    ("standalone" in navigator && Boolean((navigator as Navigator & { standalone?: boolean }).standalone));
}

// Push subscribe fails until a worker is active, but `ready` can wait forever
// on a broken registration, so it gets a deadline.
function workerReady(ms = 10_000) {
  return Promise.race([
    navigator.serviceWorker.ready,
    new Promise<null>((resolve) => window.setTimeout(() => resolve(null), ms)),
  ]);
}

export async function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return null;
  const registration = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
  const active = await workerReady();

  return active ? registration : null;
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

function missingKeyError() {
  return `Push notifications aren't configured: ${PUSH_PUBLIC_KEY_ENV} is missing from this build.`;
}

/**
 * Registers the worker, subscribes with the public key and saves the endpoint.
 * Permission is only ever requested after the build is known to have a key, so
 * a missing key never costs someone their permission prompt.
 */
export async function enablePush() {
  if (typeof window === "undefined" || !("Notification" in window)) return { error: "This browser doesn't support notifications." };

  const publicKey = pushPublicKey().trim();

  if (!publicKey) return { error: missingKeyError() };

  const granted = Notification.permission === "granted"
    ? true
    : (await Notification.requestPermission()) === "granted";

  if (!granted) {
    return {
      error: Notification.permission === "denied"
        ? "Notifications are blocked in this browser."
        : "Notifications weren't allowed.",
    };
  }

  try {
    const registration = await registerServiceWorker();
    if (!registration) return { error: "This browser can't register notifications." };

    let subscription = await registration.pushManager.getSubscription();

    if (!subscription) {
      try {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: decodeVapidKey(publicKey),
        });
      } catch {
        return { error: "Couldn't subscribe this browser. Check that the public key is a VAPID key." };
      }
    }

    const response = await fetch("/api/push/subscribe", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(subscription.toJSON()),
    });

    if (!response.ok) {
      let plain = "";
      try {
        const body = (await response.json()) as { error?: unknown };
        plain = typeof body.error === "string" ? body.error : "";
      } catch {
        plain = "";
      }

      // A failed save leaves a local subscription nobody knows about.
      await subscription.unsubscribe().catch(() => false);
      return { error: plain || "Couldn't save this device. Try again." };
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
