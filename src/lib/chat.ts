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
  body: string;
  created_at: string;
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
  name: string;
  isGroup: boolean;
  initial: string | null;
  avatarUrl: string | null;
  profileUsername: string | null;
  lastMessage: string | null;
  lastMessageAt: string | null;
  createdAt: string;
  unread: boolean;
};

export type FriendListItem = {
  id: string;
  name: string;
  username: string | null;
  initial: string;
  avatarUrl: string | null;
};

export type FriendRequestItem = FriendListItem & {
  friendshipId: string;
  createdAt: string;
};

export type SearchPerson = FriendListItem & {
  relation: "none" | "friend" | "sent" | "incoming";
  friendshipId: string | null;
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
