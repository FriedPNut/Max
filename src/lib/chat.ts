export type ChatProfile = {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  username: string | null;
  /** My solid chat bubble color, a six-digit hex. */
  bubble_color?: string | null;
  /** Read receipts default to on. */
  read_receipts?: boolean | null;
};

export type ConversationRecord = {
  id: string;
  name: string | null;
  is_group: boolean;
  created_by: string;
  created_at: string;
  /** Group photo in the photos bucket; the _t.jpg thumbnail is what renders. */
  photo_path?: string | null;
};

export type ConversationMemberRecord = {
  conversation_id: string;
  user_id: string;
  last_read_at: string | null;
  muted?: boolean | null;
  cleared_at?: string | null;
  /** What other people are allowed to see of my progress. */
  seen_at?: string | null;
};

export type MessageRecord = {
  id: string;
  conversation_id: string;
  user_id: string;
  body: string | null;
  created_at: string;
  image_path: string | null;
  edited_at: string | null;
  deleted_at: string | null;
  mentions: string[];
  /** A message shared from Prompt ideas; it renders as a card, not a bubble. */
  idea_id?: string | null;
};

export const MESSAGE_SELECT =
  "id,conversation_id,user_id,body,created_at,image_path,edited_at,deleted_at,mentions,idea_id";

export const REACTION_KEYS = [
  "like",
  "love",
  "laugh",
  "wow",
  "sad",
  "fire",
] as const;
export type ReactionKey = (typeof REACTION_KEYS)[number];

// The only place emoji are allowed in the UI.
export const REACTION_EMOJI: Record<ReactionKey, string> = {
  like: "\u{1F44D}",
  love: "\u2764\uFE0F",
  laugh: "\u{1F602}",
  wow: "\u{1F62E}",
  sad: "\u{1F622}",
  fire: "\u{1F525}",
};

export const REACTION_LABELS: Record<ReactionKey, string> = {
  like: "Like",
  love: "Love",
  laugh: "Laugh",
  wow: "Wow",
  sad: "Sad",
  fire: "Fire",
};

export function isReactionKey(value: string): value is ReactionKey {
  return (REACTION_KEYS as readonly string[]).includes(value);
}

export type ReactionMap = Record<
  string,
  Partial<Record<ReactionKey, string[]>>
>;

// Immutable add/remove of one person's reaction, dropping empty groups.
export function setReactionPresence(
  current: ReactionMap,
  messageId: string,
  reaction: ReactionKey,
  userId: string,
  present: boolean
): ReactionMap {
  const groups = { ...(current[messageId] ?? {}) };
  const users = groups[reaction] ?? [];
  const has = users.includes(userId);

  if (present === has) {
    return current;
  }

  const nextUsers = present
    ? [...users, userId]
    : users.filter((id) => id !== userId);

  if (nextUsers.length === 0) {
    delete groups[reaction];
  } else {
    groups[reaction] = nextUsers;
  }

  if (Object.keys(groups).length === 0) {
    const next = { ...current };
    delete next[messageId];
    return next;
  }

  return { ...current, [messageId]: groups };
}

export const CHAT_BUCKET = "photos";

export type ChatMember = {
  id: string;
  name: string;
  initial: string;
  username: string | null;
  avatarUrl: string | null;
};

export type ChatListItem = {
  id: string;
  otherUserId: string | null;
  name: string;
  isGroup: boolean;
  initial: string | null;
  avatarUrl: string | null;
  /** Group photo thumbnail, when the group has one. */
  photoUrl?: string | null;
  /** Notifications are off for this chat. */
  muted?: boolean;
  profileUsername: string | null;
  lastMessage: string | null;
  /** "Seen" (DM) or "Seen by Elina + 4" (group) for my latest message. */
  receipt?: string | null;
  lastMessageAt: string | null;
  createdAt: string;
  unread: boolean;
  mentionsMe: boolean;
};

export type FriendListItem = {
  id: string;
  name: string;
  username: string | null;
  initial: string;
  avatarUrl: string | null;
};

export function profileName(profile: ChatProfile | undefined) {
  return (
    profile?.display_name?.trim() ||
    profile?.username?.trim() ||
    "A friend"
  );
}

export function nameInitial(name: string) {
  return name.charAt(0).toUpperCase() || "?";
}
