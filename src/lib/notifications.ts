export type NotificationPreferenceKey =
  | "push_enabled"
  | "push_reminders"
  | "push_new_events"
  | "push_friends"
  | "push_chat"
  | "push_hangs"
  | "push_social"
  | "push_posts"
  | "push_birthdays"
  | "push_recaps";

// The one place that decides which switch a notification type follows.
// Types not listed here are never pushed: the dispatcher marks them done.
export const NOTIFICATION_TYPE_PREFERENCES = {
  event_reminder: "push_reminders",
  new_event: "push_new_events",
  friend_request: "push_friends",
  friend_accepted: "push_friends",
  buddy_request: "push_friends",
  buddy_nudge: "push_friends",
  chat_message: "push_chat",
  hang_now: "push_hangs",
  new_post: "push_posts",
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
  new_post: "New post",
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

export function notificationTitle(notification: {
  type: string;
  title?: string | null;
}) {
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

/** The minimum a notification needs to be grouped in the center. */
export type NotificationLike = {
  id: string;
  type: string;
  created_at: string;
  title?: string | null;
  body?: string | null;
  url?: string | null;
  data?: Record<string, unknown> | null;
  read_at?: string | null;
};

export type NotificationSectionId =
  | "chat"
  | "friends"
  | "posts"
  | "events"
  | "other";

// The five headings of /notifications, in the order they appear. Every type
// not listed in an earlier section falls into Other.
export const NOTIFICATION_SECTIONS: {
  id: NotificationSectionId;
  label: string;
  types: readonly string[];
}[] = [
  { id: "chat", label: "Chat", types: ["chat_message"] },
  {
    id: "friends",
    label: "Friends",
    types: ["friend_request", "friend_accepted", "buddy_request", "buddy_nudge"],
  },
  { id: "posts", label: "Posts", types: ["new_post", "post_comment"] },
  {
    id: "events",
    label: "Events",
    types: ["new_event", "event_reminder", "trip_invite", "hang_now", "birthday"],
  },
  { id: "other", label: "Other", types: [] },
];

export function notificationSectionFor(type: string): NotificationSectionId {
  return (
    NOTIFICATION_SECTIONS.find((section) => section.types.includes(type))?.id ??
    "other"
  );
}

export type NotificationDisplayRow<T extends NotificationLike = NotificationLike> = {
  key: string;
  kind: "chat" | "single";
  section: NotificationSectionId;
  conversationId: string | null;
  /** Newest notification in the row; its type chooses the destination. */
  latest: T;
  /** Every notification row the display row represents. */
  ids: string[];
  count: number;
};

function newestFirst<T extends NotificationLike>(items: T[]) {
  return [...items].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
}

function conversationIdOf(item: NotificationLike) {
  const value = item.data?.conversation_id;

  return typeof value === "string" && value.trim() ? value.trim() : null;
}

/**
 * Turns notification rows into what the center shows: one row per chat
 * conversation, one row per notification for everything else. Newest first.
 */
export function notificationDisplayRows<T extends NotificationLike>(
  items: T[]
): NotificationDisplayRow<T>[] {
  const rows: NotificationDisplayRow<T>[] = [];
  const chats = new Map<string, NotificationDisplayRow<T>>();

  for (const item of newestFirst(items)) {
    if (item.type === "chat_message") {
      const conversationId = conversationIdOf(item);
      const key = conversationId
        ? `chat:${conversationId}`
        : `chat-message:${item.id}`;
      const existing = chats.get(key);

      if (existing) {
        existing.ids.push(item.id);
        existing.count += 1;
      } else {
        const row: NotificationDisplayRow<T> = {
          key,
          kind: "chat",
          section: "chat",
          conversationId,
          latest: item,
          ids: [item.id],
          count: 1,
        };
        chats.set(key, row);
        rows.push(row);
      }

      continue;
    }

    rows.push({
      key: `single:${item.id}`,
      kind: "single",
      section: notificationSectionFor(item.type),
      conversationId: null,
      latest: item,
      ids: [item.id],
      count: 1,
    });
  }

  return rows;
}

export function notificationSections<T extends NotificationLike>(items: T[]) {
  const rows = notificationDisplayRows(items);

  return NOTIFICATION_SECTIONS.map((section) => ({
    ...section,
    rows: rows.filter((row) => row.section === section.id),
  })).filter((section) => section.rows.length > 0);
}

/** The count the bell shows: rows still in the list, not raw notifications. */
export function notificationRowCount(items: NotificationLike[]) {
  return notificationDisplayRows(items).length;
}

const ACTOR_NAME_KEYS = [
  "actor_name",
  "sender_name",
  "from_name",
  "friend_name",
  "inviter_name",
  "buddy_name",
  "creator",
  "name",
  "actor_username",
  "sender_username",
  "username",
];

function textFromData(
  data: Record<string, unknown> | null | undefined,
  keys: string[]
) {
  for (const key of keys) {
    const value = data?.[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }

  return null;
}

export function notificationActorName(item: NotificationLike) {
  return textFromData(item.data, ACTOR_NAME_KEYS);
}

const ACTOR_ID_KEYS = ["from", "actor_id", "sender_id", "user_id"];
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** The person a notification is about, when the row stores their user id. */
export function notificationActorId(item: NotificationLike) {
  return (
    textFromData(item.data, ACTOR_ID_KEYS)?.match(UUID_PATTERN)?.[0] ?? null
  );
}

export type NotificationActorProfile = {
  id: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
};

/**
 * Copies a person's name, username and (already resolved) avatar into rows
 * that only stored their id, so the row can open their profile.
 */
export function withNotificationActorProfiles<T extends NotificationLike>(
  items: T[],
  profiles: NotificationActorProfile[]
): T[] {
  const byId = new Map(profiles.map((profile) => [profile.id, profile]));

  return items.map((item) => {
    const actorId = notificationActorId(item);
    const profile = actorId ? byId.get(actorId) : undefined;
    if (!profile) return item;

    const avatar =
      profile.avatar_url && /^https?:\/\//i.test(profile.avatar_url)
        ? profile.avatar_url
        : null;

    return {
      ...item,
      data: {
        ...(item.data ?? {}),
        actor_name:
          profile.display_name?.trim() || profile.username?.trim() || null,
        actor_username: profile.username?.trim() || null,
        ...(avatar ? { actor_avatar_url: avatar } : {}),
      },
    };
  });
}

export function notificationActorAvatar(item: NotificationLike) {
  return textFromData(item.data, [
    "avatar_url",
    "actor_avatar_url",
    "sender_avatar_url",
    "conversation_avatar_url",
  ]);
}

const SENTENCE_ACTIONS: Record<string, string> = {
  friend_request: "sent you a friend request",
  friend_accepted: "accepted your friend request",
  buddy_request: "wants to be your buddy",
  buddy_nudge: "nudged you",
  new_post: "shared a new post",
  post_comment: "commented on your post",
  new_event: "added a new event",
  trip_invite: "invited you on a trip",
  hang_now: "is down to hang",
  chat_message: "sent a message",
};

export type NotificationSentence = {
  /** Rendered at 600 weight; null when the row has no person. */
  name: string | null;
  before: string;
  after: string;
};

/** A short sentence for a row, with the person's name split out to be bold. */
export function notificationSentence(item: NotificationLike): NotificationSentence {
  const name = notificationActorName(item);
  const action = SENTENCE_ACTIONS[item.type];

  if (name && action) {
    return { name, before: "", after: ` ${action}` };
  }

  if (name && item.type === "birthday") {
    return { name, before: "It’s ", after: "’s birthday" };
  }

  return { name: null, before: notificationTitle(item), after: "" };
}

export function chatNotificationTitle(item: NotificationLike) {
  return (
    textFromData(item.data, [
      "conversation_title",
      "conversation_name",
      "group_name",
      "chat_name",
    ]) ||
    item.title?.trim() ||
    "Chat"
  );
}

export function chatNotificationPreview(item: NotificationLike) {
  return (
    item.body?.trim() ||
    textFromData(item.data, [
      "preview",
      "message_preview",
      "message",
      "text",
      "last_message",
    ]) ||
    ""
  );
}

export function chatNotificationCountLabel(count: number) {
  return `${count} new ${count === 1 ? "message" : "messages"}`;
}

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

/**
 * The pre-mount label. Same "Mar 4" format as `absoluteTimeLabel` in
 * `posts.ts`; it is spelled out here too because this module is loaded by the
 * plain-`node` test runner, which cannot resolve the `@/` alias.
 */
function absoluteTimeLabel(iso: string) {
  const date = new Date(iso);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    month: "short",
    day: "numeric",
  }).format(date);
}

/**
 * Relative before a browser clock exists, absolute on the server render, so no
 * component ever reads the time while it renders.
 */
export function notificationTimeLabel(iso: string, now: number | null) {
  return now === null
    ? absoluteTimeLabel(iso)
    : notificationRelativeTime(iso, now);
}

/** Callers pass a clock they got from the browser, never a render-time read. */
export function notificationRelativeTime(iso: string, now: number) {
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
