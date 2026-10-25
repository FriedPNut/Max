import Link from "next/link";
import { SquarePen, Users } from "lucide-react";
import { AppShell, getAuthenticatedUser } from "@/components/app-shell";
import { LocalTime } from "@/components/local-time";
import { ProfileAvatar } from "@/components/profile/profile-avatar";
import { OnlineDot } from "@/components/presence-provider";
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

export default async function ChatPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q = "" } = await searchParams;
  const query = q.trim();
  const { user } = await getAuthenticatedUser();
  const supabase = await createClient();

  const escapedQuery = query.replace(/[\\%_]/g, (char) => `\\${char}`);

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

  // One batch: chats, members and (when searching) the matching messages.
  const [conversationsResult, membersResult, searchRowsResult] = await Promise.all([
    supabase
      .from("conversations")
      .select("id,name,is_group,created_by,created_at")
      .in("id", conversationIds),
    supabase
      .from("conversation_members")
      .select("conversation_id,user_id,last_read_at")
      .in("conversation_id", conversationIds),
    query.length >= 2
      ? supabase
          .from("messages")
          .select("id,conversation_id,body,created_at")
          .in("conversation_id", conversationIds)
          .is("deleted_at", null)
          .ilike("body", `%${escapedQuery}%`)
          .order("created_at", { ascending: false })
          .limit(20)
      : Promise.resolve({ data: [], error: null }),
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
  // Avatars, last message per chat and unread mentions all need the same ids,
  // so they run together instead of one after another.
  const [avatarUrls, lastMessageByConversation, mentionedByConversation] = await Promise.all([
    resolveProfileAvatarUrls(supabase, profiles),
    loadLatestMessages(supabase, conversationIds),
    loadMentionedConversations(supabase, myMemberships, user.id),
  ]);

  const membersByConversation = new Map<string, ConversationMemberRecord[]>();

  for (const member of members) {
    const existing = membersByConversation.get(member.conversation_id);

    if (existing) {
      existing.push(member);
    } else {
      membersByConversation.set(member.conversation_id, [member]);
    }
  }

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
        otherUserId: otherMember?.user_id ?? null,
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
        mentionsMe: mentionedByConversation.get(conversation.id) ?? false,
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

  const nameByConversation = new Map(items.map((item) => [item.id, item.name]));
  const searchHits = (
    (searchRowsResult.data ?? []) as {
      id: string;
      conversation_id: string;
      body: string | null;
      created_at: string;
    }[]
  ).map((row) => ({
    ...row,
    conversation_name: nameByConversation.get(row.conversation_id) ?? "Chat",
  }));

  return (
    <AppShell actions={actions}>
      <section className="space-y-8">
        <h1 className="text-[28px] font-semibold leading-tight text-text">
          Chat
        </h1>

        <form method="get" className="space-y-3">
          <label htmlFor="chat-global-search" className="block text-sm text-muted">
            Search all chats
          </label>
          <input
            id="chat-global-search"
            name="q"
            type="search"
            defaultValue={query}
            autoComplete="off"
            placeholder="Find a message"
            className="w-full bg-surface text-text placeholder:text-muted border border-border rounded-lg px-3 py-3 text-base focus:outline-2 focus:outline-offset-0 focus:outline-text"
          />
        </form>

        {query.length >= 2 && (
          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-text">Results</h2>
            {searchHits.length === 0 ? (
              <p className="text-sm text-muted">No messages match that.</p>
            ) : (
              <ul className="border-t border-line">
                {searchHits.map((hit) => (
                  <li key={hit.id} className="border-b border-line">
                    <Link
                      href={`/chat/${hit.conversation_id}?m=${hit.id}`}
                      className="flex flex-col gap-1 py-3 transition-colors duration-150 ease-out hover:text-muted"
                    >
                      <span className="text-sm text-muted">
                        {hit.conversation_name} · <LocalTime iso={hit.created_at} format="card" />
                      </span>
                      <span className="truncate text-base text-text">{hit.body}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

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
                  <span className="pointer-events-none relative z-10 flex h-10 w-10 items-center justify-center rounded-full border border-border bg-surface text-muted shrink-0">
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
                  <span className="pointer-events-none relative z-10 shrink-0 block">
                    <ProfileAvatar
                      src={conversation.avatarUrl}
                      initial={conversation.initial ?? "?"}
                      size={40}
                    />
                    <OnlineDot userId={conversation.otherUserId} />
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
                    {conversation.mentionsMe && (
                      <span aria-label="Mentioned you" className="shrink-0 text-sm font-semibold text-text">
                        @
                      </span>
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

type ServerClient = Awaited<ReturnType<typeof createClient>>;

// One query for the whole list, then a targeted lookup only for chats the
// batch didn't cover, instead of one query per chat.
async function loadLatestMessages(
  supabase: ServerClient,
  conversationIds: string[]
) {
  const byConversation = new Map<string, MessageRecord>();
  if (conversationIds.length === 0) return byConversation;

  const { data } = await supabase
    .from("messages")
    .select("id,conversation_id,user_id,body,created_at,mentions")
    .in("conversation_id", conversationIds)
    .order("created_at", { ascending: false })
    .limit(Math.min(conversationIds.length * 4, 400));

  for (const row of (data ?? []) as MessageRecord[]) {
    if (!byConversation.has(row.conversation_id)) {
      byConversation.set(row.conversation_id, row);
    }
  }

  const missing = conversationIds.filter((id) => !byConversation.has(id));

  if (missing.length > 0) {
    const rows = await Promise.all(
      missing.map(async (conversationId) => {
        const { data: latest } = await supabase
          .from("messages")
          .select("id,conversation_id,user_id,body,created_at,mentions")
          .eq("conversation_id", conversationId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        return [conversationId, (latest as MessageRecord | null) ?? null] as const;
      })
    );

    for (const [id, row] of rows) {
      if (row) byConversation.set(id, row);
    }
  }

  return byConversation;
}

// Unread mentions of me: one query, then compare each message with that chat's
// last_read_at. Replaces a count query per chat.
async function loadMentionedConversations(
  supabase: ServerClient,
  memberships: MyMembership[],
  userId: string
) {
  const mentioned = new Map<string, boolean>();
  if (memberships.length === 0) return mentioned;

  const readAt = new Map(
    memberships.map((membership) => [membership.conversation_id, membership.last_read_at])
  );
  const neverRead = memberships.some((membership) => !membership.last_read_at);

  let query = supabase
    .from("messages")
    .select("conversation_id,created_at")
    .in("conversation_id", memberships.map((membership) => membership.conversation_id))
    .contains("mentions", [userId])
    .limit(500);

  if (!neverRead) {
    const oldestReadAt = memberships
      .map((membership) => membership.last_read_at as string)
      .sort()[0];
    query = query.gt("created_at", oldestReadAt);
  }

  const { data } = await query;
  const rows = (data ?? []) as { conversation_id: string; created_at: string }[];

  for (const row of rows) {
    const lastReadAt = readAt.get(row.conversation_id);

    if (
      !lastReadAt ||
      new Date(row.created_at).getTime() > new Date(lastReadAt).getTime()
    ) {
      mentioned.set(row.conversation_id, true);
    }
  }

  return mentioned;
}
