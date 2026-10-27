"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import type { NotificationPreferenceKey } from "@/lib/notifications";

export type { NotificationPreferenceKey };

const preferenceKeys = new Set<NotificationPreferenceKey>([
  "push_enabled",
  "push_reminders",
  "push_new_events",
  "push_friends",
  "push_chat",
  "push_hangs",
  "push_social",
  "push_posts",
  "push_birthdays",
  "push_recaps",
]);

const PREFERENCE_COLUMNS =
  "push_enabled,push_reminders,push_new_events,push_friends,push_chat,push_hangs,push_social,push_posts,push_birthdays,push_recaps,timezone";

type StoredPreferences = Partial<
  Record<NotificationPreferenceKey, boolean | null>
> & { timezone?: string | null };

function preferenceDefaults(current: StoredPreferences | null) {
  return {
    push_enabled: current?.push_enabled ?? true,
    push_reminders: current?.push_reminders ?? true,
    push_new_events: current?.push_new_events ?? true,
    push_friends: current?.push_friends ?? true,
    push_chat: current?.push_chat ?? true,
    push_hangs: current?.push_hangs ?? true,
    push_social: current?.push_social ?? true,
    push_posts: current?.push_posts ?? true,
    push_birthdays: current?.push_birthdays ?? true,
    push_recaps: current?.push_recaps ?? true,
  };
}

async function requireUser() {
  if (!isSupabaseConfigured()) redirect("/login");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, user };
}

export async function saveNotificationPreference(
  key: NotificationPreferenceKey,
  value: boolean
): Promise<{ error?: string }> {
  if (!preferenceKeys.has(key) || typeof value !== "boolean") {
    return { error: "That setting couldn't be saved." };
  }
  const { supabase, user } = await requireUser();
  const { data: current } = await supabase
    .from("notification_preferences")
    .select(PREFERENCE_COLUMNS)
    .eq("user_id", user.id)
    .maybeSingle();
  const { error } = await supabase
    .from("notification_preferences")
    .upsert(
      {
        user_id: user.id,
        ...preferenceDefaults(current as StoredPreferences | null),
        timezone: current?.timezone ?? null,
        [key]: value,
      },
      { onConflict: "user_id" }
    );
  if (error) return { error: "Couldn't save that setting. Try again." };
  revalidatePath("/settings/notifications");
  revalidatePath("/events");
  return {};
}

export async function saveNotificationTimezone(
  timezone: string
): Promise<{ error?: string }> {
  const cleanTimezone = String(timezone ?? "").trim();
  if (!cleanTimezone || cleanTimezone.length > 80) {
    return { error: "That time zone isn't valid." };
  }
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: cleanTimezone });
  } catch {
    return { error: "That time zone isn't valid." };
  }
  const { supabase, user } = await requireUser();
  const { data: current } = await supabase
    .from("notification_preferences")
    .select(PREFERENCE_COLUMNS)
    .eq("user_id", user.id)
    .maybeSingle();
  const { error } = await supabase
    .from("notification_preferences")
    .upsert(
      {
        user_id: user.id,
        ...preferenceDefaults(current as StoredPreferences | null),
        timezone: cleanTimezone,
      },
      { onConflict: "user_id" }
    );
  if (error) return { error: "Couldn't save your time zone." };
  return {};
}

export async function markAllNotificationsReadAction(): Promise<{ error?: string }> {
  const { supabase, user } = await requireUser();
  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", user.id)
    .is("read_at", null);
  if (error) return { error: "Couldn't mark notifications as read." };
  revalidatePath("/notifications");
  return {};
}
