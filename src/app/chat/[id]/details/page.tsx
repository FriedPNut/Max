import { notFound } from "next/navigation";
import { AppShell, getAuthenticatedUser } from "@/components/app-shell";
import {
  ChatDetailsView,
  type DetailsFriend,
  type DetailsMember,
} from "@/components/chat/details-view";
import { createClient } from "@/lib/supabase/server";
import { resolveProfileAvatarUrls } from "@/lib/profile-data";
import { resolveConversationPhotoUrls } from "@/lib/chat-photo";
import { nicknameMap } from "@/lib/chat-details";
import {
  nameInitial,
  profileName,
  type ChatProfile,
  type ConversationMemberRecord,
  type MessageRecord,
} from "@/lib/chat";

type DetailsConversation = {
  id: string;
  name: string | null;
  is_group: boolean;
  created_by: string;
  photo_path: string | null;
};

type MyMembership = {
  conversation_id: string;
  user_id: string;
  muted: boolean | null;
  cleared_at: string | null;
};

export default async function ChatDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { user, displayName } = await getAuthenticatedUser();
  const supabase = await createClient();

  const { data: membershipData } = await supabase
    .from("conversation_members")
    .select("conversation_id,user_id,muted,cleared_at")
    .eq("conversation_id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  const membership = membershipData as MyMembership | null;

  if (!membership) {
    notFound();
  }

  const { data: conversationData } = await supabase
    .from("conversations")
    .select("id,name,is_group,created_by,photo_path")
    .eq("id", id)
    .maybeSingle();

  const conversation = conversationData as DetailsConversation | null;

  if (!conversation) {
    notFound();
  }

  const { data: memberData, error: memberError } = await supabase
    .from("conversation_members")
    .select("conversation_id,user_id,last_read_at")
    .eq("conversation_id", id);

  const members = (memberData ?? []) as ConversationMemberRecord[];
  const memberIds = members.map((member) => member.user_id);

  const [nicknameResult, friendResult, pinnedResult] = await Promise.all([
    supabase
      .from("conversation_nicknames")
      .select("user_id,nickname")
      .eq("conversation_id", id),
    supabase
      .from("friendships")
      .select("requester_id,addressee_id")
      .eq("status", "accepted")
      .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`),
    supabase
      .from("pinned_messages")
      .select("message_id,pinned_at")
      .eq("conversation_id", id)
      .order("pinned_at", { ascending: false }),
  ]);

  const nicknames = nicknameMap(
    (nicknameResult.data ?? []) as { user_id: string; nickname: string | null }[]
  );

  const friendIds = [
    ...new Set(
      ((friendResult.data ?? []) as {
        requester_id: string;
        addressee_id: string;
      }[]).map((row) =>
        row.requester_id === user.id ? row.addressee_id : row.requester_id
      )
    ),
  ].filter((friendId) => friendId !== user.id);

  const candidateIds = friendIds.filter(
    (friendId) => !memberIds.includes(friendId)
  );
  const profileIds = [...new Set([...memberIds, ...candidateIds])];

  let profiles: ChatProfile[] = [];
  let profilesError = false;

  if (profileIds.length > 0) {
    const { data, error } = await supabase
      .from("profiles")
      .select("id,display_name,avatar_url,username,bubble_color")
      .in("id", profileIds);

    profiles = (data ?? []) as ChatProfile[];
    profilesError = Boolean(error);
  }

  const profilesById = new Map(
    profiles.map((profile) => [profile.id, profile])
  );
  const avatarUrls = await resolveProfileAvatarUrls(supabase, profiles);
  const photoUrls = await resolveConversationPhotoUrls(supabase, [
    conversation.photo_path,
  ]);

  const detailsMembers: DetailsMember[] = members
    .map((member) => {
      const profile = profilesById.get(member.user_id);
      const fullName =
        member.user_id === user.id ? displayName : profileName(profile);
      const nickname = nicknames.get(member.user_id) ?? null;

      return {
        id: member.user_id,
        name: nickname ?? fullName,
        fullName,
        username: profile?.username?.trim() || null,
        initial: nameInitial(nickname ?? fullName),
        avatarUrl: avatarUrls.get(member.user_id) ?? null,
        nickname,
        isCreator: member.user_id === conversation.created_by,
        isMe: member.user_id === user.id,
      };
    })
    .sort((a, b) => {
      if (a.isCreator !== b.isCreator) {
        return a.isCreator ? -1 : 1;
      }

      return a.name.localeCompare(b.name);
    });

  const friends: DetailsFriend[] = candidateIds
    .map((friendId) => {
      const profile = profilesById.get(friendId);
      const name = profileName(profile);

      return {
        id: friendId,
        name,
        username: profile?.username?.trim() || null,
        initial: nameInitial(name),
        avatarUrl: avatarUrls.get(friendId) ?? null,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  const me = profilesById.get(user.id);
  const otherMember = conversation.is_group
    ? null
    : members.find((member) => member.user_id !== user.id) ?? null;
  const otherProfile = otherMember
    ? profilesById.get(otherMember.user_id)
    : undefined;
  const otherName = otherMember
    ? nicknames.get(otherMember.user_id) ??
      profileName(otherProfile) ??
      "A friend"
    : null;

  const pinnedIds = ((pinnedResult.data ?? []) as { message_id: string }[]).map(
    (row) => row.message_id
  );
  let pinnedMessages: { id: string; body: string | null }[] = [];

  if (pinnedIds.length > 0) {
    const { data: pinnedRows } = await supabase
      .from("messages")
      .select("id,body,deleted_at,created_at")
      .in("id", pinnedIds.slice(0, 30))
      .is("deleted_at", null)
      .order("created_at", { ascending: false });

    pinnedMessages = ((pinnedRows ?? []) as MessageRecord[])
      .filter((message) =>
        membership.cleared_at
          ? new Date(message.created_at).getTime() >
            new Date(membership.cleared_at).getTime()
          : true
      )
      .map((message) => ({ id: message.id, body: message.body }));
  }

  const title = conversation.is_group
    ? conversation.name?.trim() || "Group chat"
    : otherName ?? "Chat";
  const loadError = Boolean(memberError || profilesError);

  return (
    <AppShell title="Details">
      <ChatDetailsView
        conversationId={conversation.id}
        isGroup={conversation.is_group}
        isCreator={conversation.created_by === user.id}
        title={title}
        photoUrl={
          conversation.is_group
            ? photoUrls.get(conversation.photo_path ?? "") ?? null
            : avatarUrls.get(otherMember?.user_id ?? "") ?? null
        }
        muted={Boolean(membership.muted)}
        bubbleColor={me?.bubble_color ?? null}
        pinnedMessages={pinnedMessages}
        members={detailsMembers}
        friends={friends}
        dmUsername={otherProfile?.username?.trim() || null}
        loadError={loadError}
        currentUserId={user.id}
      />
    </AppShell>
  );
}
