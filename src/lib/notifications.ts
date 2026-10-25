export type NotificationPreferenceKey =
  | "push_enabled"
  | "push_reminders"
  | "push_new_events"
  | "push_friends"
  | "push_chat"
  | "push_hangs"
  | "push_social"
  | "push_birthdays"
  | "push_recaps";

// The one place that decides which switch a notification type follows.
// Types not listed here are never pushed: the dispatcher marks them done.
export const NOTIFICATION_TYPE_PREFERENCES = {
  event_reminder: "push_reminders",
  new_event: "push_new_events",
  friend_request: "push_friends",
  friend_accepted: "push_friends",
  chat_message: "push_chat",
  hang_now: "push_hangs",
  post_comment: "push_social",
  trip_invite: "push_friends",
  birthday: "push_birthdays",
  weekly_recap: "push_recaps",
  wrapped: "push_recaps",
  best_of_month: "push_recaps",
} as const satisfies Record<string, NotificationPreferenceKey>;

const NOTIFICATION_TYPE_TITLES: Record<string, string> = {
  event_reminder: "Event reminder",
  new_event: "New event",
  friend_request: "Friend request",
  friend_accepted: "Friend request accepted",
  chat_message: "New message",
  hang_now: "Hang right now",
  post_comment: "New comment",
  trip_invite: "Trip invite",
  birthday: "Birthday",
  weekly_recap: "Your week",
  wrapped: "Max Wrapped",
  best_of_month: "Photo of the month",
};

export function notificationPreferenceKeyFor(
  type: string
): NotificationPreferenceKey | null {
  const map: Record<string, NotificationPreferenceKey> =
    NOTIFICATION_TYPE_PREFERENCES;

  return map[type] ?? null;
}

export type NotificationPreferenceFlags = Partial<
  Record<NotificationPreferenceKey, boolean | null>
>;

export function isNotificationTypeEnabled(
  type: string,
  preferences?: NotificationPreferenceFlags | null
) {
  const key = notificationPreferenceKeyFor(type);

  // Unknown types are never pushed; the dispatcher marks them done.
  if (!key) return false;
  if (!preferences) return true;
  if (preferences.push_enabled === false) return false;

  return preferences[key] !== false;
}

export function notificationTitle(notification: NotificationRecord) {
  return (
    notification.title?.trim() ||
    NOTIFICATION_TYPE_TITLES[notification.type] ||
    "Notification"
  );
}

export type NotificationRecord = {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string | null;
  url: string | null;
  data: Record<string, unknown> | null;
  created_at: string;
  read_at: string | null;
};

function dateAtTimezone(date: Date, timezone?: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
  }).formatToParts(date);
  const values = new Map(parts.map((part) => [part.type, part.value]));
  return `${values.get("year")}-${values.get("month")}-${values.get("day")}`;
}

function nextDateKey(key: string) {
  const [year, month, day] = key.split("-").map(Number);
  const tomorrow = new Date(Date.UTC(year, month - 1, day + 1));
  return `${tomorrow.getUTCFullYear()}-${String(tomorrow.getUTCMonth() + 1).padStart(2, "0")}-${String(tomorrow.getUTCDate()).padStart(2, "0")}`;
}

export function formatNotificationBody(notification: NotificationRecord, timezone: string) {
  if (notification.body) return notification.body;
  if (notification.type !== "event_reminder" && notification.type !== "new_event") return "";
  const rawStartsAt = notification.data?.starts_at;
  if (typeof rawStartsAt !== "string") return "";
  const startsAt = new Date(rawStartsAt);
  if (Number.isNaN(startsAt.getTime())) return "";
  const now = new Date();
  const todayKey = dateAtTimezone(now, timezone);
  const tomorrowKey = nextDateKey(todayKey);
  const eventDate = dateAtTimezone(startsAt, timezone);
  const label = eventDate === todayKey
    ? "Today"
    : eventDate === tomorrowKey
      ? "Tomorrow"
      : new Intl.DateTimeFormat("en-US", { timeZone: timezone, weekday: "short", month: "short", day: "numeric" }).format(startsAt);
  const time = new Intl.DateTimeFormat("en-US", { timeZone: timezone, hour: "numeric", minute: "2-digit" }).format(startsAt);
  const details = `${label} at ${time}`;
  if (notification.type === "new_event") {
    const creator = typeof notification.data?.creator === "string" ? notification.data.creator : "A friend";
    return `${creator} added this event · ${details}`;
  }
  return details;
}

export function notificationRelativeTime(iso: string, now = Date.now()) {
  const elapsed = Math.max(0, now - new Date(iso).getTime());
  const minute = 60_000;
  const hour = 60 * minute;
  const day = 24 * hour;
  if (elapsed < minute) return "Just now";
  if (elapsed < hour) return `${Math.floor(elapsed / minute)}m`;
  if (elapsed < day) return `${Math.floor(elapsed / hour)}h`;
  if (elapsed < 7 * day) return `${Math.floor(elapsed / day)}d`;
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(new Date(iso));
}
