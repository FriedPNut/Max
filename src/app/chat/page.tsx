import Link from "next/link";
import { SquarePen, Users } from "lucide-react";
import { AppShell, getAuthenticatedUser } from "@/components/app-shell";
import { LocalTime } from "@/components/local-time";
import { ProfileAvatar } from "@/components/profile/profile-avatar";
import { createClient } from "@/lib/supabase/server";
import { resolveProfileAvatarUrls } from "@/lib/profile-data";
import {
  nameInitial,
  profileName,
  type ChatListItem,
  type ChatProfile,
  type ConversationMemberRecord,
  type ConversationRecord,
  type MessageRecord,
} from "@/lib/chat";

type MyMembership = {
  conversation_id: string;
  last_read_at: string | null;
};

export default async function ChatPage() {
  const { user } = await getAuthenticatedUser();
  const supabase = await createClient();

  const { data: membershipData, error: membershipError } = await supabase
    .from("conversation_members")
    .select("conversation_id,last_read_at")
    .eq("user_id", user.id);

  const myMemberships = (membershipData ?? []) as MyMembership[];
  const conversationIds = myMemberships.map((row) => row.conversation_id);

  const actions = (
    <>
      <Link
        href="/chat/new"
        aria-label="New message"
        title="New message"
        className="inline-flex h-11 w-11 items-center justify-center rounded-lg text-text transition-colors duration-150 ease-out hover:bg-surface"
      >
        <SquarePen size={24} strokeWidth={1.5} aria-hidden="true" />
      </Link>
      <Link
        href="/chat/friends"
        aria-label="Friends"
        title="Friends"
        className="inline-flex h-11 w-11 items-center justify-center rounded-lg text-text transition-colors duration-150 ease-out hover:bg-surface"
      >
        <Users size={24} strokeWidth={1.5} aria-hidden="true" />
      </Link>
    </>
  );

  if (conversationIds.length === 0) {
    return (
      <AppShell actions={actions}>
        <section className="space-y-8">
          <h1 className="text-[28px] font-semibold leading-tight text-text">
            Chat
          </h1>
          <p className="text-sm text-muted">
            {membershipError
              ? "Couldn't load chats. Refresh and try again."
              : "No chats yet."}
          </p>
        </section>
      </AppShell>
    );
  }

  const [conversationsResult, membersResult] = await Promise.all([
    supabase
      .from("conversations")
      .select("id,name,is_group,created_by,created_at")
      .in("id", conversationIds),
    supabase
      .from("conversation_members")
      .select("conversation_id,user_id,last_read_at")
      .in("conversation_id", conversationIds),
  ]);

  const conversations = (conversationsResult.data ??
    []) as ConversationRecord[];
  const members = (membersResult.data ?? []) as ConversationMemberRecord[];

  const memberIds = [...new Set(members.map((member) => member.user_id))];
  let profiles: ChatProfile[] = [];
  let loadError = conversationsResult.error ?? membersResult.error;

  if (memberIds.length > 0) {
    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .select("id,display_name,avatar_url,username")
      .in("id", memberIds);

    profiles = (profileData ?? []) as ChatProfile[];
    loadError = loadError ?? profileError;
  }

  const profilesById = new Map(
    profiles.map((profile) => [profile.id, profile])
  );
  const avatarUrls = await resolveProfileAvatarUrls(supabase, profiles);

  const membersByConversation = new Map<string, ConversationMemberRecord[]>();

  for (const member of members) {
    const existing = membersByConversation.get(member.conversation_id);

    if (existing) {
      existing.push(member);
    } else {
      membersByConversation.set(member.conversation_id, [member]);
    }
  }

  const lastMessages = await Promise.all(
    conversationIds.map(async (conversationId) => {
      const { data } = await supabase
        .from("messages")
        .select("id,conversation_id,user_id,body,created_at")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      return [conversationId, (data as MessageRecord | null) ?? null] as const;
    })
  );

  const lastMessageByConversation = new Map(lastMessages);
  const membershipByConversation = new Map(
    myMemberships.map((membership) => [
      membership.conversation_id,
      membership,
    ])
  );

  const items: ChatListItem[] = conversations
    .map((conversation) => {
      const conversationMembers =
        membersByConversation.get(conversation.id) ?? [];
      const otherMember = conversationMembers.find(
        (member) => member.user_id !== user.id
      );
      const otherProfile = otherMember
        ? profilesById.get(otherMember.user_id)
        : undefined;
      const name = conversation.is_group
        ? conversation.name?.trim() || "Group chat"
        : profileName(otherProfile);
      const lastMessage = lastMessageByConversation.get(conversation.id);
      const lastReadAt =
        membershipByConversation.get(conversation.id)?.last_read_at ?? null;
      const unread = Boolean(
        lastMessage &&
          (!lastReadAt ||
            new Date(lastMessage.created_at).getTime() >
              new Date(lastReadAt).getTime())
      );

      return {
        id: conversation.id,
        name,
        isGroup: conversation.is_group,
        initial: conversation.is_group ? null : nameInitial(name),
        avatarUrl: conversation.is_group
          ? null
          : otherMember
          ? avatarUrls.get(otherMember.user_id) ?? null
          : null,
        profileUsername: conversation.is_group
          ? null
          : otherProfile?.username?.trim() || null,
        lastMessage: lastMessage?.body ?? null,
        lastMessageAt: lastMessage?.created_at ?? null,
        createdAt: conversation.created_at,
        unread,
      };
    })
    .sort((a, b) => {
      const aTime = new Date(a.lastMessageAt ?? a.createdAt).getTime();
      const bTime = new Date(b.lastMessageAt ?? b.createdAt).getTime();
      return bTime - aTime;
    });

  return (
    <AppShell actions={actions}>
      <section className="space-y-8">
        <h1 className="text-[28px] font-semibold leading-tight text-text">
          Chat
        </h1>

        {loadError ? (
          <p className="text-sm text-muted">
            Couldn&apos;t load chats. Refresh and try again.
          </p>
        ) : items.length === 0 ? (
          <p className="text-sm text-muted">No chats yet.</p>
        ) : (
          <div className="border-t border-line">
            {items.map((conversation) => (
              <div
                key={conversation.id}
                className="relative flex items-center gap-3 border-b border-line py-4 transition-colors duration-150 ease-out hover:bg-surface"
              >
                <Link
                  href={`/chat/${conversation.id}`}
                  aria-label={`Open ${conversation.name}`}
                  className="absolute inset-0 z-0"
                />

                {conversation.isGroup ? (
                  <span className="pointer-events-none relative z-10 flex h-10 w-10 items-center justify-center rounded-full border border-line bg-surface text-muted shrink-0">
                    <Users size={20} strokeWidth={1.5} aria-hidden="true" />
                  </span>
                ) : conversation.profileUsername ? (
                  <Link
                    href={`/u/${encodeURIComponent(
                      conversation.profileUsername
                    )}`}
                    aria-label={`View ${conversation.name}'s profile`}
                    className="relative z-10 shrink-0 transition-opacity duration-150 ease-out hover:opacity-80"
                  >
                    <ProfileAvatar
                      src={conversation.avatarUrl}
                      initial={conversation.initial ?? "?"}
                      size={40}
                    />
                  </Link>
                ) : (
                  <span className="pointer-events-none relative z-10 shrink-0">
                    <ProfileAvatar
                      src={conversation.avatarUrl}
                      initial={conversation.initial ?? "?"}
                      size={40}
                    />
                  </span>
                )}

                <div className="pointer-events-none relative z-10 min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-3">
                    {!conversation.isGroup && conversation.profileUsername ? (
                      <Link
                        href={`/u/${encodeURIComponent(
                          conversation.profileUsername
                        )}`}
                        className="pointer-events-auto truncate text-base font-medium text-text transition-opacity duration-150 ease-out hover:opacity-80"
                      >
                        {conversation.name}
                      </Link>
                    ) : (
                      <p className="truncate text-base font-medium text-text">
                        {conversation.name}
                      </p>
                    )}

                    <LocalTime
                      iso={conversation.lastMessageAt ?? conversation.createdAt}
                      format="time"
                      className="shrink-0 text-sm text-muted"
                    />
                  </div>

                  <div className="mt-0.5 flex items-center gap-2">
                    <p className="truncate text-sm text-muted">
                      {conversation.lastMessage ?? "No messages yet."}
                    </p>
                    {conversation.unread && (
                      <span
                        aria-label="Unread messages"
                        className="h-2 w-2 shrink-0 rounded-full bg-accent"
                      />
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </AppShell>
  );
}
