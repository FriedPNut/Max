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
