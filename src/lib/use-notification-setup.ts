"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { saveNotificationPreference } from "@/app/actions/notifications";
import { createClient } from "@/lib/supabase/client";
import {
  PUSH_PUBLIC_KEY_SETTING,
  disablePush,
  enablePush,
  pushPublicKeyPresent,
} from "@/lib/push-client";
import {
  notificationSetupStateFor,
  type NotificationSetupState,
} from "@/lib/notification-setup-state";

export type { NotificationSetupState };

const REPAIR_SKIP_KEY = "max-push-repair-skipped";

// One silent repair per page load, as asked.
let repairAttempted = false;

function isIosDevice() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function isStandalone() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    ("standalone" in navigator &&
      Boolean((navigator as Navigator & { standalone?: boolean }).standalone))
  );
}

function repairSkipped() {
  try {
    return window.sessionStorage.getItem(REPAIR_SKIP_KEY) === "1";
  } catch {
    return false;
  }
}

function skipRepair() {
  try {
    window.sessionStorage.setItem(REPAIR_SKIP_KEY, "1");
  } catch {
    // Storage can be unavailable; the page-load flag still prevents loops.
  }
}

async function readPushEnabled() {
  try {
    const response = await fetch("/api/notifications/preferences", {
      cache: "no-store",
    });
    if (!response.ok) return true;
    const data = (await response.json()) as { push_enabled?: unknown };
    // A missing preferences row means everything is on.
    return data.push_enabled !== false;
  } catch {
    return true;
  }
}

async function currentSubscription() {
  try {
    const registration = await navigator.serviceWorker.getRegistration("/");
    return (await registration?.pushManager.getSubscription()) ?? null;
  } catch {
    return null;
  }
}

// true = saved on the server, false = missing, null = couldn't check.
async function serverHasEndpointFor(endpoint: string) {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("push_subscriptions")
      .select("endpoint")
      .eq("endpoint", endpoint)
      .maybeSingle();

    if (error) return null;
    return Boolean(data);
  } catch {
    return null;
  }
}

async function resolveState(): Promise<NotificationSetupState> {
  // Configured on the client means exactly one thing: the public key exists.
  const vapidKeyPresent = pushPublicKeyPresent();
  const supported =
    typeof window !== "undefined" &&
    "Notification" in window &&
    "serviceWorker" in navigator &&
    "PushManager" in window;

  if (!vapidKeyPresent) return "not-configured";
  if (!supported) return "unsupported";

  const iosNeedsInstall = isIosDevice() && !isStandalone();
  const permission = Notification.permission;
  const pushEnabled =
    iosNeedsInstall || permission === "denied"
      ? true
      : await readPushEnabled();

  let hasSubscription = false;
  let serverHasEndpoint: boolean | null = null;

  if (!iosNeedsInstall && permission === "granted" && pushEnabled) {
    const subscription = await currentSubscription();
    hasSubscription = Boolean(subscription);

    if (subscription) {
      serverHasEndpoint = await serverHasEndpointFor(subscription.endpoint);
    }
  }

  const decision = notificationSetupStateFor({
    vapidKeyPresent,
    supported,
    iosNeedsInstall,
    permission,
    pushEnabled,
    hasSubscription,
    serverHasEndpoint,
  });

  if (decision !== "needs-repair") return decision;

  // Permission is already granted, so repairing needs no prompt.
  if (repairAttempted || repairSkipped()) return "not-asked";

  repairAttempted = true;
  const result = await enablePush();

  return result.error ? "not-asked" : "ready";
}

export function useNotificationSetup() {
  const [state, setState] = useState<NotificationSetupState>("loading");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mounted = useRef(true);

  const refresh = useCallback(async () => {
    const next = await resolveState();
    if (mounted.current) setState(next);
  }, []);

  useEffect(() => {
    mounted.current = true;
    void refresh();

    const onVisibility = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    const onFocus = () => void refresh();

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("focus", onFocus);

    return () => {
      mounted.current = false;
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("focus", onFocus);
    };
  }, [refresh]);

  const turnOn = useCallback(async (): Promise<{ error?: string }> => {
    if (busy) return { error: "That didn't work. Try again." };

    setBusy(true);
    setError(null);

    try {
      if (state === "app-off") {
        const saved = await saveNotificationPreference("push_enabled", true);

        if (saved.error) {
          setError("That didn't work. Try again.");
          return { error: saved.error };
        }
      }

      const result = await enablePush();

      if (result.error) {
        // The subscription path already words its failures plainly.
        setError(result.error);
        await refresh();
        return result;
      }

      setState("ready");
      return {};
    } finally {
      if (mounted.current) setBusy(false);
    }
  }, [busy, state, refresh]);

  const turnOffThisDevice = useCallback(async (): Promise<{ error?: string }> => {
    if (busy) return { error: "That didn't work. Try again." };

    setBusy(true);
    setError(null);

    try {
      const result = await disablePush();

      if (result.error) {
        setError("That didn't work. Try again.");
        return result;
      }

      // Don't let the silent repair immediately re-subscribe this device.
      skipRepair();
      setState("not-asked");
      return {};
    } finally {
      if (mounted.current) setBusy(false);
    }
  }, [busy]);

  return {
    state,
    busy,
    error,
    /** Named setting to show when the build is missing the public key. */
    missingSetting:
      state === "not-configured" ? PUSH_PUBLIC_KEY_SETTING : null,
    refresh,
    turnOn,
    turnOffThisDevice,
  };
}
