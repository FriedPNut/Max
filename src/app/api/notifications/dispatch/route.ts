import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendWebPush } from "@/lib/push-server";
import { formatNotificationBody, type NotificationRecord } from "@/lib/notifications";

type PreferenceRow = {
  user_id: string;
  timezone: string | null;
  push_enabled: boolean | null;
  push_reminders: boolean | null;
  push_new_events: boolean | null;
  push_friends: boolean | null;
  push_chat: boolean | null;
};

type SubscriptionRow = {
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
};

const MAX_ROWS = 100;
const MAX_AGE_MS = 3 * 60 * 60 * 1000;
const MAX_ATTEMPTS = 3;
const PREFERENCE_FOR_TYPE: Record<string, keyof PreferenceRow> = {
  event_reminder: "push_reminders",
  new_event: "push_new_events",
  friend_request: "push_friends",
  friend_accepted: "push_friends",
  chat_message: "push_chat",
};

export const runtime = "nodejs";
export const maxDuration = 10;

function isEnabled(preferences: PreferenceRow | undefined, type: string) {
  if (!preferences) return true;
  if (preferences.push_enabled === false) return false;
  const key = PREFERENCE_FOR_TYPE[type];
  return key ? preferences[key] !== false : false;
}

function pushBody(row: NotificationRecord, timezone: string) {
  return formatNotificationBody(row, timezone) || row.body || "";
}

function notificationTag(row: NotificationRecord) {
  if (row.type !== "chat_message") return row.id;
  const data = row.data ?? {};
  const conversationId = data.conversation_id;
  return typeof conversationId === "string" && conversationId
    ? `chat-${conversationId}`
    : row.id;
}

function safeUrl(value: string | null, siteUrl: string) {
  const fallback = new URL("/notifications", siteUrl).toString();
  if (!value) return fallback;
  try {
    const parsed = new URL(value, siteUrl);
    return parsed.origin === new URL(siteUrl).origin ? parsed.toString() : fallback;
  } catch {
    return fallback;
  }
}

export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (!siteUrl) return NextResponse.json({ error: "Notification delivery isn't configured." }, { status: 500 });

  try {
    new URL(siteUrl);
  } catch {
    return NextResponse.json({ error: "Notification delivery isn't configured." }, { status: 500 });
  }

  const admin = createAdminClient();
  const { data: rows, error: rowsError } = await admin
    .from("notifications")
    .select("id,user_id,type,title,body,url,data,created_at,read_at,attempts,push_done_at")
    .is("push_done_at", null)
    .order("created_at", { ascending: true })
    .limit(MAX_ROWS);

  if (rowsError) return NextResponse.json({ error: "Couldn't load notifications." }, { status: 500 });

  const counts = { processed: 0, sent: 0, skipped: 0, expired: 0, retried: 0, failed: 0 };
  const pendingRows = (rows ?? []) as (NotificationRecord & { attempts: number | null })[];
  const userIds = [...new Set(pendingRows.map((row) => row.user_id))];
  const [preferencesResult, subscriptionsResult] = userIds.length
    ? await Promise.all([
        admin
          .from("notification_preferences")
          .select("user_id,timezone,push_enabled,push_reminders,push_new_events,push_friends,push_chat")
          .in("user_id", userIds),
        admin
          .from("push_subscriptions")
          .select("user_id,endpoint,p256dh,auth")
          .in("user_id", userIds),
      ])
    : [
        { data: [], error: null },
        { data: [], error: null },
      ];

  if (preferencesResult.error || subscriptionsResult.error) {
    return NextResponse.json({ error: "Couldn't load notification delivery settings." }, { status: 500 });
  }

  const preferencesByUser = new Map(
    ((preferencesResult.data ?? []) as PreferenceRow[]).map((item) => [item.user_id, item])
  );
  const subscriptionsByUser = new Map<string, SubscriptionRow[]>();
  for (const subscription of (subscriptionsResult.data ?? []) as SubscriptionRow[]) {
    const existing = subscriptionsByUser.get(subscription.user_id) ?? [];
    existing.push(subscription);
    subscriptionsByUser.set(subscription.user_id, existing);
  }

  for (const row of pendingRows) {
    counts.processed += 1;
    const doneAt = new Date().toISOString();
    const ageMs = Date.now() - new Date(row.created_at).getTime();
    const attempts = Number(row.attempts ?? 0);

    if (ageMs > MAX_AGE_MS) {
      const { error } = await admin.from("notifications").update({ push_done_at: doneAt }).eq("id", row.id).is("push_done_at", null);
      if (error) counts.failed += 1;
      else counts.skipped += 1;
      continue;
    }

    const preferences = preferencesByUser.get(row.user_id);
    if (!isEnabled(preferences, row.type)) {
      const { error } = await admin.from("notifications").update({ push_done_at: doneAt }).eq("id", row.id).is("push_done_at", null);
      if (error) counts.failed += 1;
      else counts.skipped += 1;
      continue;
    }

    const subscriptions = subscriptionsByUser.get(row.user_id) ?? [];
    if (subscriptions.length === 0) {
      const { error } = await admin.from("notifications").update({ push_done_at: doneAt }).eq("id", row.id).is("push_done_at", null);
      if (error) counts.failed += 1;
      else counts.skipped += 1;
      continue;
    }

    let timezone = preferences?.timezone || "UTC";
    try {
      new Intl.DateTimeFormat("en-US", { timeZone: timezone });
    } catch {
      timezone = "UTC";
    }
    const body = pushBody(row, timezone);
    const payload = {
      title: row.title,
      body,
      url: safeUrl(row.url, siteUrl),
      tag: notificationTag(row),
    };
    const results = await Promise.allSettled(
      subscriptions.map((subscription) => sendWebPush(subscription, payload))
    );
    const expiredEndpoints: string[] = [];
    let otherFailure = false;
    let delivered = false;

    results.forEach((result, index) => {
      if (result.status === "fulfilled") {
        delivered = true;
      } else if (result.reason?.statusCode === 404 || result.reason?.statusCode === 410) {
        expiredEndpoints.push(subscriptions[index].endpoint);
        counts.expired += 1;
      } else {
        otherFailure = true;
      }
    });

    if (expiredEndpoints.length) {
      await admin.from("push_subscriptions").delete().in("endpoint", expiredEndpoints);
    }

    if (!delivered && !otherFailure) {
      const { error } = await admin.from("notifications").update({ push_done_at: doneAt }).eq("id", row.id).is("push_done_at", null);
      if (error) counts.failed += 1;
      else counts.skipped += 1;
      continue;
    }

    if (otherFailure) {
      const nextAttempts = attempts + 1;
      const patch = nextAttempts >= MAX_ATTEMPTS
        ? { attempts: nextAttempts, push_done_at: doneAt }
        : { attempts: nextAttempts };
      const { error } = await admin.from("notifications").update(patch).eq("id", row.id).is("push_done_at", null);
      if (delivered) counts.sent += 1;
      if (error) counts.failed += 1;
      else if (nextAttempts >= MAX_ATTEMPTS) counts.failed += 1;
      else counts.retried += 1;
    } else {
      const { error } = await admin.from("notifications").update({ push_done_at: doneAt }).eq("id", row.id).is("push_done_at", null);
      if (error) counts.failed += 1;
      else counts.sent += 1;
    }
  }

  return NextResponse.json(counts);
}
