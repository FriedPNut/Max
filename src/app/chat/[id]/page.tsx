import { notFound } from "next/navigation";
import { AppShell, getAuthenticatedUser } from "@/components/app-shell";
import { ChatRoom } from "@/components/chat/chat-room";
import { createClient } from "@/lib/supabase/server";
import { resolveProfileAvatarUrls } from "@/lib/profile-data";
import { resolveConversationPhotoUrls } from "@/lib/chat-photo";
import { nicknameMap } from "@/lib/chat-details";
import { readReceiptsOn } from "@/lib/read-receipts";
import { loadIdeaCards } from "@/lib/events-data";
import { ideaIdsFromMessages } from "@/lib/ideas";
import {
  MESSAGE_SELECT,
  nameInitial,
  profileName,
  type ChatMember,
  type ChatProfile,
  type ConversationMemberRecord,
  type ConversationRecord,
  type MessageRecord,
} from "@/lib/chat";

export default async function ConversationPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ m?: string }>;
}) {
  const { id } = await params;
  const { m } = await searchParams;
  const targetMessageId = typeof m === "string" && m ? m : null;
  const { user, displayName } = await getAuthenticatedUser();
  const supabase = await createClient();

  const { data: membershipData } = await supabase
    .from("conversation_members")
    .select("conversation_id,user_id,last_read_at,cleared_at")
    .eq("conversation_id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  const membership = membershipData as {
    conversation_id: string;
    cleared_at: string | null;
  } | null;

  if (!membership) {
    notFound();
  }

  const clearedAt = membership.cleared_at;

  const { data: conversationData } = await supabase
    .from("conversations")
    .select("id,name,is_group,created_by,created_at,photo_path")
    .eq("id", id)
    .maybeSingle();

  const conversation = conversationData as ConversationRecord | null;

  if (!conversation) {
    notFound();
  }

  const { data: memberData } = await supabase
    .from("conversation_members")
    .select("conversation_id,user_id,last_read_at,seen_at")
    .eq("conversation_id", id);


  const members = (memberData ?? []) as ConversationMemberRecord[];
  const memberIds = members.map((member) => member.user_id);
  let profiles: ChatProfile[] = [];

  if (memberIds.length > 0) {
    const { data } = await supabase
      .from("profiles")
      .select("id,display_name,avatar_url,username,bubble_color,read_receipts")
      .in("id", memberIds);

    profiles = (data ?? []) as ChatProfile[];
  }

  const profilesById = new Map(
    profiles.map((profile) => [profile.id, profile])
  );
  const [avatarUrls, nicknameResult, photoUrlByPath] = await Promise.all([
    resolveProfileAvatarUrls(supabase, profiles),
    supabase
      .from("conversation_nicknames")
      .select("user_id,nickname")
      .eq("conversation_id", id),
    resolveConversationPhotoUrls(supabase, [conversation.photo_path]),
  ]);

  const nicknames = nicknameMap(
    (nicknameResult.data ?? []) as { user_id: string; nickname: string | null }[]
  );

  const chatMembers: ChatMember[] = members.map((member) => {
    const profile = profilesById.get(member.user_id);
    const name =
      member.user_id === user.id
        ? displayName
        : profileName(profile);

    return {
      id: member.user_id,
      name,
      initial: nameInitial(name),
      username: profile?.username?.trim() || null,
      avatarUrl: avatarUrls.get(member.user_id) ?? null,
    };
  });

  const otherMember = members.find((member) => member.user_id !== user.id);
  const otherProfile = otherMember
    ? profilesById.get(otherMember.user_id)
    : undefined;
  const title = conversation.is_group
    ? conversation.name?.trim() || "Group chat"
    : otherMember
    ? nicknames.get(otherMember.user_id) ?? profileName(otherProfile)
    : "Chat";
  const headerAvatarUrl = conversation.is_group
    ? photoUrlByPath.get(conversation.photo_path ?? "") ?? null
    : avatarUrls.get(otherMember?.user_id ?? "") ?? null;
  // The info icon now opens the Details screen, which also holds search.
  const infoHref = `/chat/${conversation.id}/details`;
  const bubbleColor = profilesById.get(user.id)?.bubble_color ?? null;
  const nicknameRecord = Object.fromEntries(nicknames);
  const receiptsOn = readReceiptsOn(profilesById.get(user.id));
  const receiptMembers = members
    .filter((member) => member.user_id !== user.id)
    .map((member) => ({
      id: member.user_id,
      seenAt: member.seen_at ?? null,
      receiptsOn: readReceiptsOn(profilesById.get(member.user_id)),
    }));

  const MESSAGE_PAGE_SIZE = 30;

  // Messages removed for me only: filtered out here and in the live handler.
  const { data: hiddenData } = await supabase
    .from("message_hidden")
    .select("message_id")
    .eq("user_id", user.id);
  const hiddenIds = new Set(
    ((hiddenData ?? []) as { message_id: string }[]).map((row) => row.message_id)
  );

  let messageRequest = supabase
    .from("messages")
    .select(MESSAGE_SELECT)
    .eq("conversation_id", conversation.id);

  // Cleared history never comes back, even after a refresh.
  if (clearedAt) {
    messageRequest = messageRequest.gt("created_at", clearedAt);
  }

  const { data: messageData, error: messageError } = await messageRequest
    .order("created_at", { ascending: false })
    .limit(MESSAGE_PAGE_SIZE);

  const latestPage = (messageData ?? []) as MessageRecord[];
  const hasMoreMessages = latestPage.length === MESSAGE_PAGE_SIZE;
  const messages = latestPage
    .filter((message) => !hiddenIds.has(message.id))
    .slice()
    .reverse();

  // Idea cards render on the first paint instead of arriving after mount.
  const sharedIdeaIds = ideaIdsFromMessages(messages);
  const ideaCards =
    sharedIdeaIds.length > 0
      ? (await loadIdeaCards(supabase, user.id, sharedIdeaIds)).cards
      : [];

  return (
    <AppShell userId={user.id}>
      {messageError ? (
        <div className="fixed inset-0 flex items-center justify-center bg-thread p-6 text-center text-[15px] text-muted">
          Couldn&apos;t load messages. Refresh and try again.
        </div>
      ) : (
        <ChatRoom
          key={conversation.id}
          conversationId={conversation.id}
          currentUserId={user.id}
          isGroup={conversation.is_group}
          members={chatMembers}
          initialMessages={messages}
          initialHasMore={hasMoreMessages}
          initialHiddenIds={[...hiddenIds]}
          targetMessageId={targetMessageId}
          title={title}
          otherUserId={otherMember?.user_id ?? null}
          infoHref={infoHref}
          avatarUrl={headerAvatarUrl}
          avatarInitial={nameInitial(title)}
          bubbleColor={bubbleColor}
          nicknames={nicknameRecord}
          clearedAt={clearedAt}
          receiptsOn={receiptsOn}
          receiptMembers={receiptMembers}
          initialIdeaCards={ideaCards}
        />
      )}
    </AppShell>
  );
}
