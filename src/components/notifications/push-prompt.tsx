"use client";

import { useEffect, useState } from "react";
import { useNotificationSetup } from "@/lib/use-notification-setup";

const DISMISSED_KEY = "max-push-prompt-dismissed-until";
const IOS_HELP = "To get notifications on iPhone, tap Share, then Add to Home Screen, open Max from your home screen, and turn notifications on here.";

export function PushPrompt() {
  const { state, busy, error, turnOn } = useNotificationSetup();
  // Start snoozed so the banner never flashes before storage is read.
  const [snoozed, setSnoozed] = useState(true);

  useEffect(() => {
    let until = 0;
    try {
      until = Number(localStorage.getItem(DISMISSED_KEY) || 0);
    } catch {
      // Storage can be unavailable; show the prompt.
    }
    setSnoozed(Date.now() < until);
  }, []);

  function dismiss() {
    try {
      localStorage.setItem(DISMISSED_KEY, String(Date.now() + 7 * 24 * 60 * 60 * 1000));
    } catch {
      // The prompt stays hidden for this render.
    }
    setSnoozed(true);
  }

  const visible = !snoozed && (state === "not-asked" || state === "ios-needs-install");

  if (!visible) return null;

  return <aside className="space-y-3 rounded-lg border border-border bg-surface p-4" aria-label="Push notifications">
    <p className="text-base font-medium text-text">Get reminders and updates from Max</p>
    {state === "ios-needs-install" ? <p className="text-sm leading-relaxed text-muted">{IOS_HELP}</p> : <div className="flex flex-wrap gap-2">
      <button type="button" disabled={busy} onClick={() => void turnOn()} className="inline-flex min-h-11 items-center justify-center rounded-lg bg-text px-4 py-3 text-sm font-medium text-background disabled:pointer-events-none disabled:opacity-60">{busy ? "Turning on..." : "Turn on"}</button>
    </div>}
    <div className="flex flex-wrap gap-2">
      <button type="button" onClick={dismiss} className="inline-flex min-h-11 items-center justify-center rounded-lg border border-border px-4 py-3 text-sm font-medium text-text">Not now</button>
    </div>
    {error && <p role="alert" className="text-sm text-text">{error}</p>}
  </aside>;
}
