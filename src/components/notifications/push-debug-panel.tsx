"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui";
import { pushPublicKeyPresent } from "@/lib/push-client";
import {
  PUSH_DISPATCH_SECRET_ENV,
  PUSH_PRIVATE_KEY_ENV,
  PUSH_PUBLIC_KEY_ENV,
  PUSH_SERVICE_ROLE_ENV,
  PUSH_SUBJECT_ENV,
} from "@/lib/push-settings";

type ServerStatus = {
  settings?: {
    publicKey?: boolean;
    privateKey?: boolean;
    subject?: boolean;
    serviceRole?: boolean;
    dispatchSecret?: boolean;
  };
  missing?: string[];
  vapidPairValid?: boolean;
  subjectValid?: boolean;
  subscriptions?: number | null;
  pendingNotifications?: number | null;
  endpointSaved?: boolean | null;
};

type ClientFacts = {
  checked: boolean;
  publicKeyInBuild: boolean;
  supported: boolean;
  workerRegistered: boolean;
  workerActive: boolean;
  permission: NotificationPermission | "unsupported";
  hasSubscription: boolean;
  endpoint: string | null;
};

const initialState: ClientFacts = {
  checked: false,
  publicKeyInBuild: false,
  supported: false,
  workerRegistered: false,
  workerActive: false,
  permission: "unsupported",
  hasSubscription: false,
  endpoint: null,
};

const PERMISSION_HINTS: Record<string, string> = {
  denied: "Allow notifications for this site in your browser's site settings, then reload.",
  default: "Use Turn on in notification settings to ask the browser.",
  granted: "",
};

export function Row({
  label,
  value,
  hint,
  status = "neutral",
}: {
  label: string;
  value: string;
  hint?: string;
  status?: "ok" | "bad" | "neutral";
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-line px-4 py-3 last:border-b-0">
      <div className="min-w-0">
        <p className="text-[15px] text-text">{label}</p>
        {hint ? (
          <p className="mt-1 text-[13px] leading-relaxed text-muted">{hint}</p>
        ) : null}
      </div>
      <span
        className={`shrink-0 text-[13px] font-semibold ${
          status === "bad"
            ? "text-danger"
            : status === "ok"
            ? "text-text"
            : "text-muted"
        }`}
      >
        {value}
      </span>
    </div>
  );
}

export function PushDebugPanel() {
  const [facts, setFacts] = useState<ClientFacts>(initialState);
  const [status, setStatus] = useState<ServerStatus | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  const check = useCallback(async () => {
    setChecking(true);
    setStatusError(null);

    const supported =
      typeof window !== "undefined" &&
      "Notification" in window &&
      "serviceWorker" in navigator &&
      "PushManager" in window;
    let registration: ServiceWorkerRegistration | undefined;
    let subscription: PushSubscription | null = null;

    if (supported) {
      try {
        registration = await navigator.serviceWorker.getRegistration("/");

        if (!registration) {
          // A registration from a previous visit may still be activating.
          const ready = await Promise.race([
            navigator.serviceWorker.ready,
            new Promise<null>((resolve) => window.setTimeout(() => resolve(null), 4000)),
          ]);
          registration = ready ?? undefined;
        }

        subscription = (await registration?.pushManager.getSubscription()) ?? null;
      } catch {
        registration = undefined;
      }
    }

    setFacts({
      checked: true,
      publicKeyInBuild: pushPublicKeyPresent(),
      supported,
      workerRegistered: Boolean(registration),
      workerActive: Boolean(registration?.active),
      permission: supported ? Notification.permission : "unsupported",
      hasSubscription: Boolean(subscription),
      endpoint: subscription?.endpoint ?? null,
    });

    try {
      const query = subscription
        ? `?endpoint=${encodeURIComponent(subscription.endpoint)}`
        : "";
      const response = await fetch(`/api/push/status${query}`, {
        cache: "no-store",
      });
      const body = (await response.json()) as ServerStatus & { error?: string };

      if (!response.ok) {
        setStatus(null);
        setStatusError(body.error ?? "Couldn't read the server settings.");
      } else {
        setStatus(body);
      }
    } catch {
      setStatus(null);
      setStatusError("Couldn't read the server settings.");
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    void check();
  }, [check]);

  async function sendTest() {
    if (testing) return;
    setTesting(true);
    setTestResult(null);

    try {
      const response = await fetch("/api/push/test", { method: "POST" });
      const body = (await response.json()) as {
        error?: string;
        statusCodes?: number[];
      };
      const codes = (body.statusCodes ?? [])
        .map((code) => (code ? String(code) : "no response"))
        .join(", ");

      if (!response.ok) {
        setTestResult(
          `${body.error ?? "The test push failed."}${
            codes ? ` Push service: ${codes}.` : ""
          }`
        );
        return;
      }

      setTestResult(
        codes ? `Push service responded ${codes}.` : "The push was sent."
      );
    } catch {
      setTestResult("The test push request failed.");
    } finally {
      setTesting(false);
    }
  }

  const settings = status?.settings;
  const pending = !facts.checked;
  const settingRow = (label: string, name: string, present?: boolean) => (
    <Row
      key={name}
      label={label}
      value={
        present === undefined ? (checking ? "Checking..." : "Unknown") : present ? "Yes" : "No"
      }
      status={present === false ? "bad" : present ? "ok" : "neutral"}
      hint={
        present === false
          ? `${name} is not set in this server's environment. Add it and redeploy.`
          : undefined
      }
    />
  );

  return (
    <div className="space-y-6">
      <section className="space-y-2">
        <h2 className="px-4 text-[13px] text-muted">This browser</h2>

        <div className="overflow-hidden rounded-card bg-surface">
          <Row
            label="Public key present in the build"
            value={pending ? "Checking..." : facts.publicKeyInBuild ? "Yes" : "No"}
            status={pending ? "neutral" : facts.publicKeyInBuild ? "ok" : "bad"}
            hint={
              !pending && !facts.publicKeyInBuild
                ? `${PUSH_PUBLIC_KEY_ENV} was not inlined into this build's JavaScript. Set it where the app is built, then rebuild and redeploy — a runtime-only value never reaches the browser.`
                : undefined
            }
          />
          <Row
            label="Browser supports push"
            value={pending ? "Checking..." : facts.supported ? "Yes" : "No"}
            status={pending ? "neutral" : facts.supported ? "ok" : "bad"}
            hint={
              !pending && !facts.supported
                ? "This browser has no Push API. Try Chrome, Edge or Firefox."
                : undefined
            }
          />
          <Row
            label="Service worker"
            value={
              pending
                ? "Checking..."
                : facts.workerActive
                ? "Registered and active"
                : facts.workerRegistered
                ? "Registered, not active"
                : "Not registered"
            }
            status={pending ? "neutral" : facts.workerActive ? "ok" : "bad"}
            hint={
              !pending && !facts.workerActive
                ? "Reload the page. If it stays missing, make sure /sw.js loads and the site is served over HTTPS."
                : undefined
            }
          />
          <Row
            label="Permission"
            value={pending ? "Checking..." : facts.permission}
            status={
              pending
                ? "neutral"
                : facts.permission === "granted"
                ? "ok"
                : facts.permission === "denied"
                ? "bad"
                : "neutral"
            }
            hint={pending ? undefined : PERMISSION_HINTS[facts.permission] || undefined}
          />
          <Row
            label="This device has a subscription"
            value={pending ? "Checking..." : facts.hasSubscription ? "Yes" : "No"}
            status={pending ? "neutral" : facts.hasSubscription ? "ok" : "bad"}
            hint={
              !pending && !facts.hasSubscription
                ? "Open notifications settings and use Turn on. If permission is already granted, reloading subscribes quietly."
                : undefined
            }
          />
          <Row
            label="Server has this endpoint saved"
            value={
              pending
                ? "Checking..."
                : !facts.hasSubscription
                ? "No subscription to match"
                : status?.endpointSaved === true
                ? "Yes"
                : status?.endpointSaved === false
                ? "No"
                : "Unknown"
            }
            status={
              facts.hasSubscription
                ? status?.endpointSaved === true
                  ? "ok"
                  : status?.endpointSaved === false
                  ? "bad"
                  : "neutral"
                : "neutral"
            }
            hint={
              facts.hasSubscription && status?.endpointSaved === false
                ? "The browser subscribed but the server never stored it. Use Turn off, then Turn on."
                : undefined
            }
          />
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="px-4 text-[13px] text-muted">On the server</h2>

        <div className="overflow-hidden rounded-card bg-surface">
          {settingRow("Public key", PUSH_PUBLIC_KEY_ENV, settings?.publicKey)}
          {settingRow("Private key", PUSH_PRIVATE_KEY_ENV, settings?.privateKey)}
          {settingRow("Subject", PUSH_SUBJECT_ENV, settings?.subject)}
          {settingRow("Service role key", PUSH_SERVICE_ROLE_ENV, settings?.serviceRole)}
          {settingRow(
            "Dispatch secret",
            PUSH_DISPATCH_SECRET_ENV,
            settings?.dispatchSecret
          )}

          <Row
            label="Subject format"
            value={
              status
                ? status.subjectValid
                  ? "Valid"
                  : "Invalid"
                : checking
                ? "Checking..."
                : "Unknown"
            }
            status={status ? (status.subjectValid ? "ok" : "bad") : "neutral"}
            hint={
              status && !status.subjectValid
                ? `The push service needs a contact: set ${PUSH_SUBJECT_ENV} to mailto:you@example.com (a bare email is accepted) or an https:// URL.`
                : undefined
            }
          />
          <Row
            label="VAPID keys form a pair"
            value={
              status
                ? status.vapidPairValid
                  ? "Yes"
                  : "No"
                : checking
                ? "Checking..."
                : "Unknown"
            }
            status={status ? (status.vapidPairValid ? "ok" : "bad") : "neutral"}
            hint={
              status && !status.vapidPairValid
                ? "The public key is not the one that belongs to the private key. Regenerate the pair and set both, or copy the public half of the key you already use."
                : undefined
            }
          />
          <Row
            label="Saved subscriptions"
            value={
              status?.subscriptions === null || status?.subscriptions === undefined
                ? checking
                  ? "Checking..."
                  : "Unknown"
                : String(status.subscriptions)
            }
            status={status?.subscriptions ? "ok" : "neutral"}
            hint={
              status?.subscriptions === null
                ? "The server couldn't count subscriptions. Check the service role key."
                : undefined
            }
          />
          <Row
            label="Pending notifications"
            value={
              status?.pendingNotifications === null || status?.pendingNotifications === undefined
                ? checking
                  ? "Checking..."
                  : "Unknown"
                : String(status.pendingNotifications)
            }
            status="neutral"
            hint={
              (status?.pendingNotifications ?? 0) > 0
                ? "Rows with no push_done_at yet. The dispatcher sends them on its next run."
                : undefined
            }
          />

        </div>

        {statusError ? (
          <p role="alert" className="px-4 text-[13px] text-danger">
            {statusError}
          </p>
        ) : null}
      </section>

      <section className="space-y-3">
        <Button
          variant="secondary"
          onClick={() => void check()}
          disabled={checking}
          className="w-full"
        >
          {checking ? "Checking..." : "Check again"}
        </Button>

        <Button
          onClick={() => void sendTest()}
          disabled={testing || !facts.hasSubscription}
          className="w-full"
        >
          {testing ? "Sending..." : "Send test push"}
        </Button>

        {!facts.hasSubscription && (
          <p className="text-[13px] text-muted">
            A test needs a subscription on this device first.
          </p>
        )}

        {testResult && (
          <p role="status" className="text-[13px] text-text">
            {testResult}
          </p>
        )}
      </section>
    </div>
  );
}
