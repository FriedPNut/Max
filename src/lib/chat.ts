export type ChatProfile = {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  username: string | null;
};

export type FriendshipRecord = {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: string;
  created_at: string;
};

export type ConversationRecord = {
  id: string;
  name: string | null;
  is_group: boolean;
  created_by: string;
  created_at: string;
};

export type ConversationMemberRecord = {
  conversation_id: string;
  user_id: string;
  last_read_at: string | null;
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
};

export const MESSAGE_SELECT =
  "id,conversation_id,user_id,body,created_at,image_path,edited_at,deleted_at,mentions";

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

export type ReactionRecord = {
  message_id: string;
  user_id: string;
  reaction: ReactionKey;
};

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
export const CHAT_SIGNED_URL_SECONDS = 60 * 60;
export const CHAT_PAGE_SIZE = 30;

export type PinnedRecord = {
  message_id: string;
  conversation_id: string;
  pinned_by: string;
  pinned_at: string;
};

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
  profileUsername: string | null;
  lastMessage: string | null;
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
