"use client";

import { useEffect, useState } from "react";
import { Button, Card } from "@/components/ui";
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

  return <Card className="space-y-3 p-4" aria-label="Push notifications">
    <p className="text-base font-semibold text-text">Get reminders and updates from Max</p>
    {state === "ios-needs-install" ? <p className="text-sm leading-relaxed text-muted">{IOS_HELP}</p> : <div className="flex flex-wrap gap-2">
      <Button loading={busy} onClick={() => void turnOn()}>{busy ? "Turning on..." : "Turn on"}</Button>
    </div>}
    <div className="flex flex-wrap gap-2">
      <Button variant="secondary" onClick={dismiss}>Not now</Button>
    </div>
    {error && <p role="alert" className="text-sm text-text">{error}</p>}
  </Card>;
}
