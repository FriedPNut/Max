"use client";

import { createClient } from "@/lib/supabase/client";

/**
 * Fired after notifications are deleted so the bell and the center agree
 * without waiting for Realtime's DELETE event.
 */
export const NOTIFICATIONS_CHANGED_EVENT = "max:notifications-changed";

export function announceNotificationsChanged() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(NOTIFICATIONS_CHANGED_EVENT));
}

type ClearResult = { error?: string };

type StoredNotification = {
  id: string;
  type: string;
  url: string | null;
  data: Record<string, unknown> | null;
};

function pathnameOf(url: string | null) {
  if (!url) return null;

  const path = url.split(/[?#]/, 1)[0] || "/";
  return path.length > 1 ? path.replace(/\/+$/, "") || "/" : path;
}

function hasId(data: Record<string, unknown> | null, keys: string[], id: string) {
  for (const key of keys) {
    const value = data?.[key];
    if (typeof value === "string" && value === id) return true;
    if (typeof value === "number" && String(value) === id) return true;
  }

  return false;
}

export async function deleteNotificationIds(ids: string[]): Promise<ClearResult> {
  const unique = [...new Set(ids.filter(Boolean))];
  if (unique.length === 0) return {};

  try {
    const { error } = await createClient()
      .from("notifications")
      .delete()
      .in("id", unique);

    if (error) return { error: "Couldn't clear that notification." };

    announceNotificationsChanged();
    return {};
  } catch {
    return { error: "Couldn't clear that notification." };
  }
}

/** One conversation's chat notifications, however many messages piled up. */
export async function clearChatMessageNotifications(
  conversationId: string
): Promise<ClearResult> {
  if (!conversationId) return {};

  try {
    const { error } = await createClient()
      .from("notifications")
      .delete()
      .eq("type", "chat_message")
      .contains("data", { conversation_id: conversationId });

    if (error) return { error: "Couldn't clear those notifications." };

    announceNotificationsChanged();
    return {};
  } catch {
    return { error: "Couldn't clear those notifications." };
  }
}

async function clearMatching(
  types: string[],
  matches: (row: StoredNotification) => boolean
): Promise<ClearResult> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("notifications")
      .select("id,type,url,data")
      .in("type", types)
      .order("created_at", { ascending: false })
      .limit(300);

    if (error) return { error: "Couldn't clear those notifications." };

    const ids = ((data ?? []) as StoredNotification[])
      .filter(matches)
      .map((row) => row.id);

    return deleteNotificationIds(ids);
  } catch {
    return { error: "Couldn't clear those notifications." };
  }
}

/** Clears every notification about a post, including all of its comments. */
export async function clearPostNotifications(postId: string): Promise<ClearResult> {
  if (!postId) return {};

  return clearMatching(
    ["new_post", "post_comment"],
    (row) =>
      hasId(row.data, ["post_id", "postId"], postId) ||
      pathnameOf(row.url) === `/feed/${postId}`
  );
}

/** Clears every notification about an event. */
export async function clearEventNotifications(
  eventId: string
): Promise<ClearResult> {
  if (!eventId) return {};

  return clearMatching(
    ["new_event", "event_reminder", "trip_invite"],
    (row) =>
      hasId(row.data, ["event_id", "eventId"], eventId) ||
      pathnameOf(row.url) === `/events/${eventId}`
  );
}

/** Every row the center currently lists. */
export async function clearAllNotifications(): Promise<ClearResult> {
  try {
    const { error } = await createClient()
      .from("notifications")
      .delete()
      .is("read_at", null);

    if (error) return { error: "Couldn't clear your notifications." };

    announceNotificationsChanged();
    return {};
  } catch {
    return { error: "Couldn't clear your notifications." };
  }
}
