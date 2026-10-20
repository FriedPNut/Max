import "server-only";
import webpush from "web-push";
import { createAdminClient } from "@/lib/supabase/admin";

type StoredSubscription = {
  endpoint: string;
  p256dh: string;
  auth: string;
};

let vapidConfigured = false;
function configureVapid() {
  if (vapidConfigured) return;
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;
  if (!publicKey || !privateKey || !subject) throw new Error("Push notifications aren't configured.");
  webpush.setVapidDetails(subject, publicKey, privateKey);
  vapidConfigured = true;
}

export async function sendWebPush(
  subscription: StoredSubscription,
  payload: { title: string; body: string; url: string; tag: string }
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

export async function sendPushToUser(userId: string, payload: { title: string; body?: string | null; url?: string; tag?: string }) {
  configureVapid();
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("push_subscriptions")
    .select("endpoint,p256dh,auth")
    .eq("user_id", userId);
  if (error) throw new Error("Couldn't load push subscriptions.");
  const subscriptions = (data ?? []) as StoredSubscription[];
  const results = await Promise.allSettled(subscriptions.map((subscription) =>
    webpush.sendNotification(
      { endpoint: subscription.endpoint, keys: { p256dh: subscription.p256dh, auth: subscription.auth } },
      JSON.stringify({ ...payload, body: payload.body ?? "", url: payload.url ?? "/notifications" })
    )
  ));
  const expired = results.flatMap((result, index) =>
    result.status === "rejected" && (result.reason?.statusCode === 404 || result.reason?.statusCode === 410)
      ? [subscriptions[index].endpoint]
      : []
  );
  if (expired.length) await admin.from("push_subscriptions").delete().in("endpoint", expired);
  return { sent: results.filter((result) => result.status === "fulfilled").length, failed: results.length - results.filter((result) => result.status === "fulfilled").length };
}
