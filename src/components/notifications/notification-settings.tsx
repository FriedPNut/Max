"use client";

import { useEffect, useState } from "react";
import {
  saveNotificationPreference,
  saveNotificationTimezone,
  type NotificationPreferenceKey,
} from "@/app/actions/notifications";
import { useNotificationSetup } from "@/lib/use-notification-setup";
import { Switch } from "@/components/ui/switch";

type Preferences = Record<NotificationPreferenceKey, boolean>;

const categories: {
  key: Exclude<NotificationPreferenceKey, "push_enabled">;
  label: string;
  help: string;
}[] = [
  { key: "push_reminders", label: "Event reminders", help: "The day before and an hour before events you’re going to" },
  { key: "push_new_events", label: "New events", help: "When a friend adds an event" },
  { key: "push_friends", label: "Friends", help: "Requests, accepted requests, and trip invites" },
  { key: "push_chat", label: "Chat messages", help: "When someone messages you" },
  { key: "push_hangs", label: "Hang requests", help: "When a friend is down to hang" },
  { key: "push_social", label: "Comments", help: "When someone comments on your post" },
  { key: "push_birthdays", label: "Birthdays", help: "The day before and the day of" },
  { key: "push_recaps", label: "Recaps", help: "Weekly recap, Max Wrapped, and photo of the month" },
];

const defaultPreferences: Preferences = {
  push_enabled: true,
  push_reminders: true,
  push_new_events: true,
  push_friends: true,
  push_chat: true,
  push_hangs: true,
  push_social: true,
  push_birthdays: true,
  push_recaps: true,
};

const primaryButton = "inline-flex min-h-11 items-center justify-center rounded-lg bg-text px-4 py-3 text-sm font-medium text-background transition-opacity duration-150 hover:opacity-90 disabled:pointer-events-none disabled:opacity-60";
const secondaryButton = "inline-flex min-h-11 items-center justify-center rounded-lg border border-border bg-transparent px-4 py-3 text-sm font-medium text-text transition-colors duration-150 hover:bg-surface disabled:pointer-events-none disabled:opacity-60";

export function NotificationSettings({ initialPreferences }: { initialPreferences: (Partial<Preferences> & { timezone?: string | null }) | null }) {
  const [preferences, setPreferences] = useState<Preferences>({ ...defaultPreferences, ...initialPreferences });
  const [error, setError] = useState<string | null>(null);
  const [testPending, setTestPending] = useState(false);
  const {
    state: deviceState,
    busy: deviceBusy,
    error: deviceError,
    refresh: refreshDevice,
    turnOn: turnOnDevice,
    turnOffThisDevice,
  } = useNotificationSetup();

  useEffect(() => {
    try {
      const key = "max-notification-timezone-session";
      if (window.sessionStorage.getItem(key)) return;
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (initialPreferences?.timezone === timezone) {
        window.sessionStorage.setItem(key, "saved");
        return;
      }
      void saveNotificationTimezone(timezone).then((result) => {
        if (result.error) setError(result.error);
        else window.sessionStorage.setItem(key, "saved");
      });
    } catch {
      // Storage can be unavailable; timezone saving can be retried in a new session.
    }
  }, [initialPreferences?.timezone]);

  async function toggle(key: NotificationPreferenceKey) {
    const next = !preferences[key];
    const previous = preferences;
    setError(null);
    setPreferences((current) => ({ ...current, [key]: next }));
    const result = await saveNotificationPreference(key, next);
    if (result.error) {
      setPreferences(previous);
      setError(result.error);
      return;
    }
    await refreshDevice();
  }

  // Turning the device on while the master switch is off also flips the
  // switch above, so the two sections never disagree.
  async function turnOnDeviceAndSync() {
    const result = await turnOnDevice();

    if (!result?.error) {
      setPreferences((current) => ({ ...current, push_enabled: true }));
    }
  }

  async function sendTest() {
    if (testPending) return;
    setTestPending(true);
    setError(null);
    try {
      const response = await fetch("/api/push/test", { method: "POST" });
      const result = await response.json();
      if (!response.ok) setError(result.error ?? "Couldn't send a test notification.");
    } catch {
      setError("Couldn't send a test notification.");
    } finally {
      setTestPending(false);
    }
  }

  const iosInstructions = "To get notifications on iPhone, tap Share, then Add to Home Screen, open Max from your home screen, and turn notifications on here.";

  return <div className="space-y-8">
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-4 border-b border-line py-4">
        <div><h2 className="text-base font-medium text-text">Notifications</h2><p className="mt-1 text-sm text-muted">Allow Max to send updates to your devices.</p></div>
        <Switch checked={preferences.push_enabled} label="Notifications" onChange={() => void toggle("push_enabled")} />
      </div>
      {categories.map((item) => <div key={item.key} className="flex items-center justify-between gap-4 border-b border-line py-4">
        <div><h3 className="text-base text-text">{item.label}</h3><p className="mt-1 text-sm text-muted">{item.help}</p></div>
        <Switch checked={preferences[item.key]} disabled={!preferences.push_enabled} label={item.label} onChange={() => void toggle(item.key)} />
      </div>)}
    </section>

    <section className="space-y-3">
      <h2 className="text-lg font-semibold text-text">This device</h2>
      {deviceState === "ios-needs-install" ? <p className="text-sm leading-relaxed text-muted">{iosInstructions}</p> : deviceState === "blocked" ? <p className="text-sm leading-relaxed text-muted">Notifications are blocked in your browser settings. Allow them for Max in your browser, then come back here.</p> : <p className="text-sm text-muted">{deviceState === "ready" ? "Notifications are on for this device." : deviceState === "unsupported" ? "This browser doesn’t support push notifications." : deviceState === "not-configured" ? "Push notifications aren’t configured yet." : deviceState === "loading" ? "Checking this device…" : "Notifications are off for this device."}</p>}
      {(deviceState === "not-asked" || deviceState === "app-off") && <button type="button" disabled={deviceBusy} onClick={() => void turnOnDeviceAndSync()} className={primaryButton}>{deviceBusy ? "Turning on..." : "Turn on"}</button>}
      {deviceState === "ready" && <button type="button" disabled={deviceBusy} onClick={() => void turnOffThisDevice()} className={secondaryButton}>{deviceBusy ? "Saving..." : "Turn off"}</button>}
      {deviceState === "ready" && <button type="button" disabled={testPending} onClick={() => void sendTest()} className={`${secondaryButton} ml-2`}>{testPending ? "Sending..." : "Send test notification"}</button>}
    </section>

    {(error || deviceError) && <p role="alert" className="text-sm text-text">{error ?? deviceError}</p>}
  </div>;
}
