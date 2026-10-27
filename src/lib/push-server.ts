import "server-only";
import webpush from "web-push";
import { createAdminClient } from "@/lib/supabase/admin";
import { pushServerStatus, pushVapidSubject } from "@/lib/push-env";
import { vapidKeyPairValid, vapidSubjectValid } from "@/lib/push-keys";
import {
  PUSH_PRIVATE_KEY_ENV,
  PUSH_PUBLIC_KEY_ENV,
  PUSH_SUBJECT_ENV,
} from "@/lib/push-settings";

type StoredSubscription = {
  endpoint: string;
  p256dh: string;
  auth: string;
};

export type PushPayload = {
  title: string;
  body: string;
  url: string;
  tag: string;
};

export type PushSendResult = {
  sent: number;
  failed: number;
  /** Endpoints the push service says are gone (404/410). */
  expired: number;
  /** The push service's response per endpoint; 0 when it never answered. */
  statusCodes: number[];
};

let vapidConfigured = false;

export function configureVapid() {
  if (vapidConfigured) return;

  const publicKey = process.env[PUSH_PUBLIC_KEY_ENV];
  const privateKey = process.env[PUSH_PRIVATE_KEY_ENV];
  const subject = pushVapidSubject();

  if (!publicKey || !privateKey || !subject) {
    const { missing } = pushServerStatus();
    throw new Error(
      `Push notifications aren't configured. Missing: ${missing.join(", ")}.`
    );
  }

  if (!vapidKeyPairValid(publicKey, privateKey)) {
    throw new Error(
      "Push notifications aren't configured: the VAPID public and private keys don't match."
    );
  }

  if (!vapidSubjectValid(subject)) {
    throw new Error(
      `Push notifications aren't configured: ${PUSH_SUBJECT_ENV} must be a mailto: address or an https:// URL.`
    );
  }

  webpush.setVapidDetails(subject, publicKey, privateKey);
  vapidConfigured = true;
}

export async function sendWebPush(
  subscription: StoredSubscription,
  payload: PushPayload
) {
  configureVapid();
  return webpush.sendNotification(
    {
      endpoint: subscription.endpoint,
      keys: { p256dh: subscription.p256dh, auth: subscription.auth },
    },
    JSON.stringify(payload)
  );
}

function statusCodeOf(result: PromiseSettledResult<unknown>) {
  if (result.status === "fulfilled") {
    const value = result.value as { statusCode?: number } | undefined;
    return typeof value?.statusCode === "number" ? value.statusCode : 201;
  }

  const reason = result.reason as { statusCode?: number } | undefined;
  return typeof reason?.statusCode === "number" ? reason.statusCode : 0;
}

function isGone(code: number) {
  return code === 404 || code === 410;
}

export async function sendPushToUser(
  userId: string,
  payload: { title: string; body?: string | null; url?: string; tag?: string }
): Promise<PushSendResult> {
  configureVapid();
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("push_subscriptions")
    .select("endpoint,p256dh,auth")
    .eq("user_id", userId);

  if (error) throw new Error("Couldn't load push subscriptions.");

  const subscriptions = (data ?? []) as StoredSubscription[];
  const message: PushPayload = {
    title: payload.title,
    body: payload.body ?? "",
    url: payload.url ?? "/notifications",
    tag: payload.tag ?? "max",
  };
  const results = await Promise.allSettled(
    subscriptions.map((subscription) => sendWebPush(subscription, message))
  );
  const statusCodes = results.map(statusCodeOf);
  const expired = statusCodes
    .map((code, index) => (isGone(code) ? subscriptions[index].endpoint : null))
    .filter((endpoint): endpoint is string => Boolean(endpoint));

  if (expired.length) {
    await admin.from("push_subscriptions").delete().in("endpoint", expired);
  }

  const sent = results.filter((result) => result.status === "fulfilled").length;

  return {
    sent,
    failed: results.length - sent,
    expired: expired.length,
    statusCodes,
  };
}
