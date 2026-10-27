import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Info } from "lucide-react";
import { AppShell, getAuthenticatedUser } from "@/components/app-shell";
import { ChatRoom } from "@/components/chat/chat-room";
import { DmActiveStatus } from "@/components/chat/dm-active-status";
import { Avatar } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";
import { resolveProfileAvatarUrls } from "@/lib/profile-data";
import {
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

  const { data: membership } = await supabase
    .from("conversation_members")
    .select("conversation_id,user_id,last_read_at")
    .eq("conversation_id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership) {
    notFound();
  }

  const { data: conversationData } = await supabase
    .from("conversations")
    .select("id,name,is_group,created_by,created_at")
    .eq("id", id)
    .maybeSingle();

  const conversation = conversationData as ConversationRecord | null;

  if (!conversation) {
    notFound();
  }

  const { data: memberData } = await supabase
    .from("conversation_members")
    .select("conversation_id,user_id,last_read_at")
    .eq("conversation_id", id);

  const members = (memberData ?? []) as ConversationMemberRecord[];
  const memberIds = members.map((member) => member.user_id);
  let profiles: ChatProfile[] = [];

  if (memberIds.length > 0) {
    const { data } = await supabase
      .from("profiles")
      .select("id,display_name,avatar_url,username")
      .in("id", memberIds);

    profiles = (data ?? []) as ChatProfile[];
  }

  const profilesById = new Map(
    profiles.map((profile) => [profile.id, profile])
  );
  const avatarUrls = await resolveProfileAvatarUrls(supabase, profiles);

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
  const otherUsername = otherProfile?.username?.trim() || null;
  const title = conversation.is_group
    ? conversation.name?.trim() || "Group chat"
    : profileName(otherProfile);
  const headerAvatarUrl = conversation.is_group
    ? null
    : avatarUrls.get(otherMember?.user_id ?? "") ?? null;
  const infoHref = conversation.is_group
    ? `/chat/${conversation.id}/members`
    : otherUsername
    ? `/u/${encodeURIComponent(otherUsername)}`
    : `/chat/${conversation.id}/members`;

  const MESSAGE_PAGE_SIZE = 30;
  const { data: messageData, error: messageError } = await supabase
    .from("messages")
    .select("id,conversation_id,user_id,body,created_at,image_path,edited_at,deleted_at,mentions")
    .eq("conversation_id", conversation.id)
    .order("created_at", { ascending: false })
    .limit(MESSAGE_PAGE_SIZE);

  const messages = ((messageData ?? []) as MessageRecord[])
    .slice()
    .reverse();
  const hasMoreMessages = messages.length === MESSAGE_PAGE_SIZE;

  return (
    <AppShell noIsland>
      <section className="space-y-4">
        <header className="flex items-center gap-2">
          <Link
            href="/chat"
            aria-label="Back to messages"
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-text transition-colors duration-200 ease-out hover:bg-surface-2"
          >
            <ArrowLeft size={24} strokeWidth={1.75} aria-hidden="true" />
          </Link>

          <Avatar
            src={headerAvatarUrl}
            initial={nameInitial(title)}
            size={32}
          />

          <div className="min-w-0 flex-1">
            <h1 className="truncate text-[15px] font-semibold leading-tight text-text">
              {title}
            </h1>

            {conversation.is_group ? (
              <p className="mt-0.5 truncate text-xs text-muted">
                {chatMembers.length}{" "}
                {chatMembers.length === 1 ? "member" : "members"}
              </p>
            ) : (
              <DmActiveStatus userId={otherMember?.user_id ?? null} />
            )}
          </div>

          <Link
            href={infoHref}
            aria-label="Chat info"
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-text transition-colors duration-200 ease-out hover:bg-surface-2"
          >
            <Info size={24} strokeWidth={1.75} aria-hidden="true" />
          </Link>
        </header>

        {messageError ? (
          <p className="text-sm text-muted">
            Couldn&apos;t load messages. Refresh and try again.
          </p>
        ) : (
          <ChatRoom
            key={conversation.id}
            conversationId={conversation.id}
            currentUserId={user.id}
            isGroup={conversation.is_group}
            members={chatMembers}
            initialMessages={messages}
            initialHasMore={hasMoreMessages}
            targetMessageId={targetMessageId}
            dmHeaderUserId={conversation.is_group ? null : otherMember?.user_id ?? null}
          />
        )}
      </section>
    </AppShell>
  );
}
