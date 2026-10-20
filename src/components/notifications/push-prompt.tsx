"use client";

import { useEffect, useState } from "react";
import { enablePush, getPushStatus, type PushStatus } from "@/lib/push-client";

const DISMISSED_KEY = "max-push-prompt-dismissed-until";
const IOS_HELP = "To get notifications on iPhone, tap Share, then Add to Home Screen, open Max from your home screen, and turn notifications on here.";

export function PushPrompt() {
  const [status, setStatus] = useState<PushStatus | null>(null);
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    void Promise.all([getPushStatus(), fetch("/api/notifications/preferences").then((response) => response.ok ? response.json() : { push_enabled: true }).catch(() => ({ push_enabled: true }))]).then(([current, preferences]) => {
      if (!alive) return;
      setStatus(current);
      let until = 0;
      try { until = Number(localStorage.getItem(DISMISSED_KEY) || 0); } catch { /* ignore unavailable storage */ }
      setVisible(preferences.push_enabled === true && current !== "enabled" && current !== "blocked" && current !== "unsupported" && Date.now() > until);
    });
    return () => { alive = false; };
  }, []);

  function dismiss() {
    try { localStorage.setItem(DISMISSED_KEY, String(Date.now() + 7 * 24 * 60 * 60 * 1000)); } catch { /* prompt remains hidden for this render */ }
    setVisible(false);
  }

  async function turnOn() {
    if (busy) return;
    setBusy(true);
    setError(null);
    const result = await enablePush();
    const next = await getPushStatus();
    setStatus(next);
    if (result.error) setError(result.error);
    else setVisible(false);
    setBusy(false);
  }

  if (!visible || !status) return null;
  return <aside className="space-y-3 rounded-lg border border-line bg-surface p-4" aria-label="Push notifications">
    <p className="text-base font-medium text-text">Get reminders and updates from Max</p>
    {status === "ios-needs-install" ? <p className="text-sm leading-relaxed text-muted">{IOS_HELP}</p> : <div className="flex flex-wrap gap-2">
      <button type="button" disabled={busy} onClick={() => void turnOn()} className="inline-flex min-h-11 items-center justify-center rounded-lg bg-text px-4 py-3 text-sm font-medium text-white disabled:pointer-events-none disabled:opacity-60">{busy ? "Turning on..." : "Turn on"}</button>
    </div>}
    <div className="flex flex-wrap gap-2">
      <button type="button" onClick={dismiss} className="inline-flex min-h-11 items-center justify-center rounded-lg border border-line px-4 py-3 text-sm font-medium text-text">Not now</button>
    </div>
    {error && <p role="alert" className="text-sm text-text">{error}</p>}
  </aside>;
}
