import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { AppShell, getAuthenticatedUser } from "@/components/app-shell";
import { AddMemberButton } from "@/components/chat/add-member-button";
import { LeaveGroupButton } from "@/components/chat/leave-group-button";
import { RenameGroupForm } from "@/components/chat/rename-group-form";
import { Avatar } from "@/components/ui/avatar";
import { createClient } from "@/lib/supabase/server";
import { resolveProfileAvatarUrls } from "@/lib/profile-data";
import {
  nameInitial,
  profileName,
  type ChatMember,
  type ChatProfile,
  type ConversationMemberRecord,
  type ConversationRecord,
  type FriendListItem,
} from "@/lib/chat";

type FriendshipRow = {
  requester_id: string;
  addressee_id: string;
};

export default async function GroupMembersPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { user, displayName } = await getAuthenticatedUser();
  const supabase = await createClient();

  const { data: membership } = await supabase
    .from("conversation_members")
    .select("conversation_id")
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

  if (!conversation || !conversation.is_group) {
    notFound();
  }

  const { data: memberData, error: membersError } = await supabase
    .from("conversation_members")
    .select("conversation_id,user_id,last_read_at")
    .eq("conversation_id", conversation.id);

  const members = (memberData ?? []) as ConversationMemberRecord[];
  const memberIds = new Set(members.map((member) => member.user_id));

  const { data: friendshipData, error: friendshipError } = await supabase
    .from("friendships")
    .select("requester_id,addressee_id")
    .eq("status", "accepted")
    .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`);

  const candidateIds = [
    ...new Set(
      ((friendshipData ?? []) as FriendshipRow[])
        .map((friendship) =>
          friendship.requester_id === user.id
            ? friendship.addressee_id
            : friendship.requester_id
        )
        .filter((friendId) => friendId !== user.id && !memberIds.has(friendId))
    ),
  ];

  const profileIds = [...new Set([...memberIds, ...candidateIds])];
  let profiles: ChatProfile[] = [];
  let profilesError = false;

  if (profileIds.length > 0) {
    const { data, error } = await supabase
      .from("profiles")
      .select("id,display_name,avatar_url,username")
      .in("id", profileIds);

    profiles = (data ?? []) as ChatProfile[];
    profilesError = Boolean(error);
  }

  const profilesById = new Map(
    profiles.map((profile) => [profile.id, profile])
  );
  const avatarUrls = await resolveProfileAvatarUrls(supabase, profiles);

  const groupMembers: ChatMember[] = members
    .map((member) => {
      const profile = profilesById.get(member.user_id);
      const name =
        member.user_id === user.id ? displayName : profileName(profile);

      return {
        id: member.user_id,
        name,
        initial: nameInitial(name),
        username: profile?.username?.trim() || null,
        avatarUrl: avatarUrls.get(member.user_id) ?? null,
      };
    })
    .sort((a, b) => {
      if (a.id === user.id) {
        return -1;
      }

      if (b.id === user.id) {
        return 1;
      }

      return a.name.localeCompare(b.name);
    });

  const addableFriends: FriendListItem[] = candidateIds
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

  const title = conversation.name?.trim() || "Group chat";
  const isCreator = conversation.created_by === user.id;
  const loadError = Boolean(membersError || friendshipError || profilesError);

  return (
    <AppShell>
      <section key={conversation.id} className="space-y-8">
        <div>
          <Link
            href={`/chat/${conversation.id}`}
            className="mb-6 inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-text transition-opacity duration-200 ease-out hover:opacity-80"
          >
            <ArrowLeft size={24} strokeWidth={1.75} aria-hidden="true" />
            Chat
          </Link>

          <h1 className="text-[22px] font-bold leading-tight text-text break-words">
            {title}
          </h1>
          <p className="mt-2 text-sm text-muted">
            {groupMembers.length}{" "}
            {groupMembers.length === 1 ? "member" : "members"}
          </p>
        </div>

        {loadError ? (
          <p role="alert" className="text-sm text-danger">
            Couldn&apos;t load this group. Refresh and try again.
          </p>
        ) : (
          <>
            <section className="space-y-3">
              <h2 className="text-lg font-semibold text-text">Members</h2>

              <ul className="border-t border-line">
                {groupMembers.map((member) => {
                  const tags = [
                    member.id === user.id ? "You" : null,
                    member.id === conversation.created_by ? "Creator" : null,
                  ].filter(Boolean);

                  return (
                    <li
                      key={member.id}
                      className="flex min-h-14 items-center gap-3 border-b border-line py-3"
                    >
                      {member.username ? (
                        <Link
                          href={`/u/${encodeURIComponent(member.username)}`}
                          aria-label={`View ${member.name}'s profile`}
                          className="shrink-0 transition-opacity duration-200 ease-out hover:opacity-80"
                        >
                          <Avatar
                            src={member.avatarUrl}
                            initial={member.initial}
                            size={40}
                          />
                        </Link>
                      ) : (
                        <Avatar
                          src={member.avatarUrl}
                          initial={member.initial}
                          size={40}
                        />
                      )}

                      <div className="min-w-0 flex-1">
                        {member.username ? (
                          <Link
                            href={`/u/${encodeURIComponent(member.username)}`}
                            className="block truncate text-[15px] font-semibold text-text transition-opacity duration-200 ease-out hover:opacity-70"
                          >
                            {member.name}
                          </Link>
                        ) : (
                          <p className="truncate text-[15px] font-semibold text-text">
                            {member.name}
                          </p>
                        )}
                      </div>

                      {tags.length > 0 && (
                        <span className="shrink-0 text-xs text-muted">
                          {tags.join(" · ")}
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>

            {isCreator && (
              <section className="space-y-3">
                <h2 className="text-lg font-semibold text-text">Group name</h2>
                <RenameGroupForm
                  conversationId={conversation.id}
                  initialName={title}
                />
              </section>
            )}

            <section className="space-y-3">
              <h2 className="text-lg font-semibold text-text">Add friends</h2>

              {addableFriends.length === 0 ? (
                <p className="text-sm text-muted">No friends to add.</p>
              ) : (
                <div className="border-t border-line">
                  {addableFriends.map((friend) => (
                    <AddMemberButton
                      key={friend.id}
                      conversationId={conversation.id}
                      friend={friend}
                    />
                  ))}
                </div>
              )}
            </section>

            <section>
              <LeaveGroupButton conversationId={conversation.id} />
            </section>
          </>
        )}
      </section>
    </AppShell>
  );
}
