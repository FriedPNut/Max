import Link from "next/link";
import { BellOff, Search, SquarePen, Users } from "lucide-react";
import { FastLink } from "@/components/ui/fast-link";
import { AppShell, getAuthenticatedUser } from "@/components/app-shell";
import { LocalTime } from "@/components/local-time";
import { Avatar } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { OnlineDot } from "@/components/presence-provider";
import { createClient } from "@/lib/supabase/server";
import { resolveProfileAvatarUrls } from "@/lib/profile-data";
import { resolveConversationPhotoUrls } from "@/lib/chat-photo";
import { chatHiddenAfterClear } from "@/lib/chat-details";
import {
  hasSeen,
  readReceiptsOn,
  seenByLabel,
} from "@/lib/read-receipts";
import { messagePreview } from "@/lib/ideas";
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
  muted?: boolean | null;
  cleared_at?: string | null;
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
    .select("conversation_id,last_read_at,muted,cleared_at")
    .eq("user_id", user.id);

  const myMemberships = (membershipData ?? []) as MyMembership[];
  const { data: ownProfile } = await supabase
    .from("profiles")
    .select("username,read_receipts")
    .eq("id", user.id)
    .maybeSingle();
  const myReceiptsOn = readReceiptsOn(ownProfile);
  const ownTitle = ownProfile?.username ? `@${ownProfile.username}` : "Messages";
  const conversationIds = myMemberships.map((row) => row.conversation_id);

  const actions = (
    <>
      <Link
        href="/chat/new"
        aria-label="New message"
        title="New message"
        className="inline-flex h-11 w-11 items-center justify-center rounded-full text-text transition-colors duration-200 ease-out hover:bg-surface-2"
      >
        <SquarePen size={24} strokeWidth={1.75} aria-hidden="true" />
      </Link>
      <Link
        href="/people"
        aria-label="People"
        title="People"
        className="inline-flex h-11 w-11 items-center justify-center rounded-full text-text transition-colors duration-200 ease-out hover:bg-surface-2"
      >
        <Users size={24} strokeWidth={1.75} aria-hidden="true" />
      </Link>
    </>
  );

  if (conversationIds.length === 0) {
    return (
      <AppShell actions={actions}>
        <section className="space-y-6">
          <h1 className="text-[20px] font-bold leading-tight text-text">
            Messages
          </h1>

          <form method="get" role="search" className="relative">
            <Search
              size={20}
              strokeWidth={1.75}
              aria-hidden="true"
              className="pointer-events-none absolute left-4 top-1/2 z-10 -translate-y-1/2 text-muted"
            />
            <Input
              id="chat-global-search"
              name="q"
              type="search"
              defaultValue={query}
              autoComplete="off"
              placeholder="Search messages"
              aria-label="Search all chats"
              pill
              className="bg-surface-2"
              style={{ paddingLeft: "2.75rem" }}
            />
          </form>

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
      .select("id,name,is_group,created_by,created_at,photo_path")
      .in("id", conversationIds),
    supabase
      .from("conversation_members")
      .select("conversation_id,user_id,last_read_at,seen_at")
      .in("conversation_id", conversationIds),
    query.length >= 2
      ? (async () => {
          // Shared ideas are findable by title, not only by their note.
          const { data: ideaRows } = await supabase
            .from("event_ideas")
            .select("id")
            .ilike("title", `%${escapedQuery}%`)
            .limit(20);
          const ideaIds = ((ideaRows ?? []) as { id: string }[]).map(
            (row) => row.id
          );
          const baseQuery = () =>
            supabase
              .from("messages")
              .select("id,conversation_id,body,created_at,image_path,idea_id")
              .in("conversation_id", conversationIds)
              .is("deleted_at", null);
          const [bodyResult, ideaResult] = await Promise.all([
            baseQuery()
              .ilike("body", `%${escapedQuery}%`)
              .order("created_at", { ascending: false })
              .limit(20),
            ideaIds.length > 0
              ? baseQuery()
                  .in("idea_id", ideaIds)
                  .order("created_at", { ascending: false })
                  .limit(20)
              : Promise.resolve({ data: [], error: null }),
          ]);
          const seen = new Set<string>();
          const rows = [
            ...((bodyResult.data ?? []) as {
              id: string;
            }[]),
            ...((ideaResult.data ?? []) as { id: string }[]),
          ].filter((row) => {
            if (seen.has(row.id)) {
              return false;
            }

            seen.add(row.id);
            return true;
          });

          return {
            data: rows,
            error: bodyResult.error ?? ideaResult.error,
          };
        })()
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
  const [avatarUrls, photoUrlByPath, lastMessageByConversation, mentionedByConversation] =
    await Promise.all([
      resolveProfileAvatarUrls(supabase, profiles),
      resolveConversationPhotoUrls(
        supabase,
        conversations.map((conversation) => conversation.photo_path)
      ),
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

  // Group rows show the first two other people as overlapping circles. This is
  // derived from the members and avatars already loaded above.
  const groupAvatarsByConversation = new Map<
    string,
    { src: string | null; initial: string }[]
  >();

  for (const [conversationId, conversationMembers] of membersByConversation) {
    const people = conversationMembers
      .filter((member) => member.user_id !== user.id)
      .slice(0, 2)
      .map((member) => {
        const profile = profilesById.get(member.user_id);
        const name = profileName(profile);

        return {
          src: avatarUrls.get(member.user_id) ?? null,
          initial: nameInitial(name),
        };
      });

    if (people.length > 0) {
      groupAvatarsByConversation.set(conversationId, people);
    }
  }

  const items: ChatListItem[] = conversations
    .filter((conversation) => {
      const membership = membershipByConversation.get(conversation.id);
      const lastMessage = lastMessageByConversation.get(conversation.id);

      // A cleared chat stays gone until something newer arrives.
      return !chatHiddenAfterClear(
        lastMessage?.created_at ?? null,
        membership?.cleared_at ?? null
      );
    })
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
      const membership = membershipByConversation.get(conversation.id);
      const lastMessage = lastMessageByConversation.get(conversation.id);
      const lastReadAt = membership?.last_read_at ?? null;
      const unread = Boolean(
        lastMessage &&
          (!lastReadAt ||
            new Date(lastMessage.created_at).getTime() >
              new Date(lastReadAt).getTime())
      );
      // A receipt only exists for my latest message, and only when my own
      // receipts are on: everyone else hides theirs from me too.
      let receipt: string | null = null;

      if (myReceiptsOn && lastMessage && lastMessage.user_id === user.id) {
        const seen = conversationMembers
          .filter(
            (member) =>
              member.user_id !== user.id &&
              readReceiptsOn(profilesById.get(member.user_id)) &&
              hasSeen(member.seen_at, lastMessage.created_at)
          )
          .sort(
            (a, b) =>
              (Date.parse(b.seen_at ?? "") || 0) -
              (Date.parse(a.seen_at ?? "") || 0)
          );

        if (seen.length > 0) {
          receipt = conversation.is_group
            ? seenByLabel(
                seen.map((member) =>
                  profileName(profilesById.get(member.user_id))
                )
              )
            : "Seen";
        }
      }

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
        photoUrl: conversation.is_group
          ? photoUrlByPath.get(conversation.photo_path ?? "") ?? null
          : null,
        muted: Boolean(membership?.muted),
        profileUsername: conversation.is_group
          ? null
          : otherProfile?.username?.trim() || null,
        mentionsMe: mentionedByConversation.get(conversation.id) ?? false,
        lastMessage: lastMessage
          ? lastMessage.body ??
            (lastMessage.idea_id
              ? lastMessage.user_id === user.id
                ? "You shared an idea"
                : "Shared an idea"
              : lastMessage.image_path
              ? lastMessage.user_id === user.id
                ? "You sent a photo"
                : "Sent a photo"
              : null)
          : null,
        lastMessageAt: lastMessage?.created_at ?? null,
        createdAt: conversation.created_at,
        unread,
        receipt,
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
      image_path: string | null;
      idea_id?: string | null;
    }[]
  ).map((row) => ({
    ...row,
    conversation_name: nameByConversation.get(row.conversation_id) ?? "Chat",
  }));

  return (
    <AppShell actions={actions}>
      <section className="space-y-6">
        <h1 className="text-[20px] font-bold leading-tight text-text">
          Messages
        </h1>

        <form method="get" role="search" className="relative">
          <Search
            size={20}
            strokeWidth={1.75}
            aria-hidden="true"
            className="pointer-events-none absolute left-4 top-1/2 z-10 -translate-y-1/2 text-muted"
          />
          <Input
            id="chat-global-search"
            name="q"
            type="search"
            defaultValue={query}
            autoComplete="off"
            placeholder="Search messages"
            aria-label="Search all chats"
            pill
            className="bg-surface-2"
            style={{ paddingLeft: "2.75rem" }}
          />
        </form>

        {query.length >= 2 && (
          <section className="space-y-2">
            <h2 className="text-base font-semibold text-text">Results</h2>
            {searchHits.length === 0 ? (
              <p className="text-sm text-muted">No messages match that.</p>
            ) : (
              <ul className="space-y-1">
                {searchHits.map((hit) => (
                  <li key={hit.id}>
                    <Link
                      href={`/chat/${hit.conversation_id}?m=${hit.id}`}
                      className="flex flex-col gap-1 rounded-lg px-3 py-3 transition-colors duration-200 ease-out hover:bg-surface-2"
                    >
                      <span className="text-xs text-muted">
                        {hit.conversation_name} · <LocalTime iso={hit.created_at} format="card" />
                      </span>
                      <span className="truncate text-[14px] text-text">
                        {messagePreview(hit) ?? ""}
                      </span>
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
          <div className="space-y-1">
            {items.map((conversation) => {
              const groupAvatars =
                groupAvatarsByConversation.get(conversation.id) ?? [];

              return (
                <div
                  key={conversation.id}
                  className="press-row relative flex items-center gap-3 rounded-lg py-2 transition-colors duration-200 ease-out hover:bg-surface-2"
                >
                  <FastLink
                    href={`/chat/${conversation.id}`}
                    aria-label={`Open ${conversation.name}`}
                    className="absolute inset-0 z-0 rounded-lg"
                  />

                  {conversation.isGroup ? (
                    <span className="pointer-events-none relative z-10 block h-14 w-14 shrink-0">
                      {conversation.photoUrl ? (
                        <Avatar
                          src={conversation.photoUrl}
                          initial={nameInitial(conversation.name)}
                          name={conversation.name}
                          size={64}
                        />
                      ) : groupAvatars.length >= 2 ? (
                        <>
                          <span className="absolute left-0 top-0 block rounded-full ring-2 ring-background">
                            <Avatar
                              src={groupAvatars[0].src}
                              initial={groupAvatars[0].initial}
                              size={32}
                            />
                          </span>
                          <span className="absolute bottom-0 right-0 block rounded-full ring-2 ring-background">
                            <Avatar
                              src={groupAvatars[1].src}
                              initial={groupAvatars[1].initial}
                              size={32}
                            />
                          </span>
                        </>
                      ) : groupAvatars.length === 1 ? (
                        <Avatar
                          src={groupAvatars[0].src}
                          initial={groupAvatars[0].initial}
                          size={64}
                        />
                      ) : (
                        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-surface-2 text-muted">
                          <Users
                            size={24}
                            strokeWidth={1.75}
                            aria-hidden="true"
                          />
                        </span>
                      )}
                    </span>
                  ) : (
                    <span className="relative z-10 block shrink-0">
                      {conversation.profileUsername ? (
                        <Link
                          href={`/u/${encodeURIComponent(
                            conversation.profileUsername
                          )}`}
                          aria-label={`View ${conversation.name}'s profile`}
                          className="block transition-opacity duration-200 ease-out hover:opacity-80"
                        >
                          <Avatar
                            src={conversation.avatarUrl}
                            initial={conversation.initial ?? "?"}
                            size={64}
                          />
                        </Link>
                      ) : (
                        <Avatar
                          src={conversation.avatarUrl}
                          initial={conversation.initial ?? "?"}
                          size={64}
                        />
                      )}
                      <OnlineDot userId={conversation.otherUserId} />
                    </span>
                  )}

                  <div className="pointer-events-none relative z-10 min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      {!conversation.isGroup && conversation.profileUsername ? (
                        <Link
                          href={`/u/${encodeURIComponent(
                            conversation.profileUsername
                          )}`}
                          className={`pointer-events-auto truncate text-[15px] text-text transition-opacity duration-200 ease-out hover:opacity-80 ${
                            conversation.unread ? "font-semibold" : "font-normal"
                          }`}
                        >
                          {conversation.name}
                        </Link>
                      ) : (
                        <p
                          className={`truncate text-[15px] text-text ${
                            conversation.unread ? "font-semibold" : "font-normal"
                          }`}
                        >
                          {conversation.name}
                        </p>
                      )}

                      <span className="flex shrink-0 items-center gap-2">
                        {conversation.muted ? (
                          <BellOff
                            size={14}
                            strokeWidth={1.75}
                            aria-label="Muted"
                            className="text-muted"
                          />
                        ) : null}
                        <LocalTime
                          iso={conversation.lastMessageAt ?? conversation.createdAt}
                          format="time"
                          className="text-xs text-muted"
                        />
                        {conversation.unread && (
                          <span
                            aria-label="Unread messages"
                            className="h-2 w-2 rounded-full bg-primary"
                          />
                        )}
                      </span>
                    </div>

                    <div className="mt-0.5 flex items-center gap-2">
                      <p
                        className={`truncate text-[14px] ${
                          conversation.unread
                            ? "font-semibold text-text"
                            : "text-muted"
                        }`}
                      >
                        {conversation.lastMessage ?? "No messages yet."}
                      </p>
                      {conversation.receipt ? (
                        <span className="shrink-0 text-[12px] text-muted">
                          {conversation.receipt}
                        </span>
                      ) : null}
                      {conversation.mentionsMe && (
                        <span
                          aria-label="Mentioned you"
                          className="shrink-0 text-sm font-semibold text-text"
                        >
                          @
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
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
    .from("messages")      .select("id,conversation_id,user_id,body,created_at,image_path,mentions,idea_id")
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
          .select("id,conversation_id,user_id,body,created_at,image_path,mentions,idea_id")
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
