"use client";

import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { Button, Card } from "@/components/ui";
import {
  useNotificationSetup,
  type NotificationSetupState,
} from "@/lib/use-notification-setup";

const SHOW_STATES: NotificationSetupState[] = [
  "not-asked",
  "app-off",
  "blocked",
  "ios-needs-install",
];

type FixStep = { label: string; text: string };

const FIX_STEPS: Record<"chrome" | "android" | "safari", FixStep> = {
  chrome: {
    label: "Chrome or Edge on a computer",
    text: "Click the icon to the left of the address bar, choose Site settings or Permissions, and set Notifications to Allow.",
  },
  android: {
    label: "Android",
    text: "Tap the lock icon, then Permissions, then Notifications, then Allow.",
  },
  safari: {
    label: "Safari on Mac",
    text: "Use Safari Settings, then Websites, then Notifications.",
  },
};

function orderedFixSteps(): FixStep[] {
  if (typeof navigator === "undefined") {
    return [FIX_STEPS.chrome, FIX_STEPS.android, FIX_STEPS.safari];
  }

  const ua = navigator.userAgent;
  const android = /android/i.test(ua);
  const macSafari = /macintosh|mac os x/i.test(ua) && /safari/i.test(ua) && !/chrome|chromium|edg\//i.test(ua);

  if (android) return [FIX_STEPS.android, FIX_STEPS.chrome, FIX_STEPS.safari];
  if (macSafari) return [FIX_STEPS.safari, FIX_STEPS.chrome, FIX_STEPS.android];
  return [FIX_STEPS.chrome, FIX_STEPS.android, FIX_STEPS.safari];
}

export function NotificationSetupBanner() {
  const { state, busy, error, refresh, turnOn } = useNotificationSetup();
  const [shown, setShown] = useState<NotificationSetupState | null>(null);
  const [fading, setFading] = useState(false);
  const [checking, setChecking] = useState(false);
  const [fixSteps, setFixSteps] = useState<FixStep[]>(() => [
    FIX_STEPS.chrome,
    FIX_STEPS.android,
    FIX_STEPS.safari,
  ]);

  useEffect(() => {
    setFixSteps(orderedFixSteps());
  }, []);

  useEffect(() => {
    if (state === "loading") return;

    if (SHOW_STATES.includes(state)) {
      setFading(false);
      setShown(state);
      return;
    }

    if (!shown) return;

    // Fade out before unmounting once notifications are on.
    setFading(true);
    const timer = window.setTimeout(() => {
      setShown(null);
      setFading(false);
    }, 160);

    return () => window.clearTimeout(timer);
  }, [state, shown]);

  if (!shown) return null;

  const content =
    shown === "app-off"
      ? {
          title: "You turned notifications off",
          line: "Turn them back on to get updates from Max.",
        }
      : shown === "blocked"
        ? {
            title: "Notifications are blocked",
            line: "Your browser is blocking Max. Allow notifications for this site, then come back.",
          }
        : shown === "ios-needs-install"
          ? {
              title: "Add Max to your Home Screen",
              line: "iPhone only sends notifications to installed apps.",
            }
          : {
              title: "Notifications are off",
              line: "Turn them on to hear about events, messages, and hangs.",
            };

  async function recheck() {
    if (checking) return;
    setChecking(true);
    await refresh();
    setChecking(false);
  }

  return (
    <aside aria-label={content.title}>
    <Card
      className={`p-4 transition-opacity duration-200 ease-out ${
        fading ? "opacity-0" : "opacity-100"
      }`}
    >
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-2 text-muted">
          <Bell size={20} strokeWidth={1.75} aria-hidden="true" />
        </span>

        <div className="min-w-0 flex-1 space-y-1">
          <p className="text-base font-semibold text-text">{content.title}</p>
          <p className="text-sm leading-relaxed text-muted">{content.line}</p>
        </div>
      </div>

      {shown === "ios-needs-install" && (
        <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm leading-relaxed text-muted">
          <li>Tap Share.</li>
          <li>Tap Add to Home Screen.</li>
          <li>Open Max from your home screen.</li>
          <li>Then turn notifications on here.</li>
        </ol>
      )}

      {shown === "blocked" && (
        <details className="mt-3">
          <summary className="inline-flex min-h-11 cursor-pointer list-none items-center text-sm text-text [&::-webkit-details-marker]:hidden">
            How to fix
          </summary>

          <div className="space-y-2 pt-1">
            {fixSteps.map((step) => (
              <p key={step.label} className="text-sm leading-relaxed text-muted">
                <span className="text-text">{step.label}:</span> {step.text}
              </p>
            ))}
          </div>
        </details>
      )}

      {(shown === "not-asked" || shown === "app-off") && (
        <div className="mt-3">
          <Button
            variant="primary"
            loading={busy}
            onClick={() => void turnOn()}
            className="w-full sm:w-auto"
          >
            Turn on
          </Button>
        </div>
      )}

      {shown === "blocked" && (
        <div className="mt-3">
          <Button
            variant="primary"
            loading={checking}
            onClick={() => void recheck()}
            className="w-full sm:w-auto"
          >
            I&apos;ve changed it
          </Button>
        </div>
      )}

      {error && (
        <p role="alert" className="mt-2 text-sm text-text">
          {error}
        </p>
      )}
    </Card>
    </aside>
  );
}
