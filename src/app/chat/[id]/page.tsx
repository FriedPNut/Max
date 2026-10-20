import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { AppShell, getAuthenticatedUser } from "@/components/app-shell";
import { ChatRoom } from "@/components/chat/chat-room";
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
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
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

  const MESSAGE_PAGE_SIZE = 30;
  const { data: messageData, error: messageError } = await supabase
    .from("messages")
    .select("id,conversation_id,user_id,body,created_at")
    .eq("conversation_id", conversation.id)
    .order("created_at", { ascending: false })
    .limit(MESSAGE_PAGE_SIZE);

  const messages = ((messageData ?? []) as MessageRecord[])
    .slice()
    .reverse();
  const hasMoreMessages = messages.length === MESSAGE_PAGE_SIZE;

  return (
    <AppShell>
      <section className="space-y-6">
        <div>
          <Link
            href="/chat"
            className="inline-flex min-h-11 items-center gap-1.5 text-sm text-muted hover:text-text transition-colors duration-150 ease-out mb-6"
          >
            <ArrowLeft size={20} strokeWidth={1.5} aria-hidden="true" />
            Chat
          </Link>

          <h1 className="text-[28px] font-semibold leading-tight text-text break-words">
            {conversation.is_group ? (
              <Link
                href={`/chat/${conversation.id}/members`}
                className="transition-opacity duration-150 ease-out hover:opacity-80"
              >
                {title}
              </Link>
            ) : otherUsername ? (
              <Link
                href={`/u/${encodeURIComponent(otherUsername)}`}
                className="transition-opacity duration-150 ease-out hover:opacity-80"
              >
                {title}
              </Link>
            ) : (
              title
            )}
          </h1>

          {conversation.is_group && (
            <p className="mt-1 text-sm text-muted">
              {chatMembers.length}{" "}
              {chatMembers.length === 1 ? "member" : "members"}
            </p>
          )}
        </div>

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
          />
        )}
      </section>
    </AppShell>
  );
}
