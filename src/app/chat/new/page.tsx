import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AppShell, getAuthenticatedUser } from "@/components/app-shell";
import { NewChatForm } from "@/components/chat/new-chat-form";
import { buttonStyles } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { resolveProfileAvatarUrls } from "@/lib/profile-data";
import {
  nameInitial,
  profileName,
  type ChatProfile,
  type FriendListItem,
} from "@/lib/chat";

export default async function NewChatPage() {
  const { user } = await getAuthenticatedUser();
  const supabase = await createClient();

  const { data: friendshipData, error: friendshipError } = await supabase
    .from("friendships")
    .select("requester_id,addressee_id")
    .eq("status", "accepted")
    .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`);

  const friendIds = [
    ...new Set(
      (friendshipData ?? []).map(
        (friendship: { requester_id: string; addressee_id: string }) =>
          friendship.requester_id === user.id
            ? friendship.addressee_id
            : friendship.requester_id
      )
    ),
  ];

  let profiles: ChatProfile[] = [];
  let loadError = friendshipError;

  if (friendIds.length > 0) {
    const { data, error } = await supabase
      .from("profiles")
      .select("id,display_name,avatar_url,username")
      .in("id", friendIds);

    profiles = (data ?? []) as ChatProfile[];
    loadError = loadError ?? error;
  }

  const profilesById = new Map(
    profiles.map((profile) => [profile.id, profile])
  );
  const avatarUrls = await resolveProfileAvatarUrls(supabase, profiles);

  const friends: FriendListItem[] = friendIds
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

  return (
    <AppShell noIsland>
      <section className="space-y-8">
        <div>
          <Link
            href="/chat"
            className="mb-6 inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-text transition-opacity duration-200 ease-out hover:opacity-80"
          >
            <ArrowLeft size={24} strokeWidth={1.75} aria-hidden="true" />
            Chat
          </Link>
          <h1 className="text-[22px] font-bold leading-tight text-text">
            New message
          </h1>
          <p className="mt-2 text-sm text-muted">
            Pick one friend for a direct message, or a few for a group.
          </p>
        </div>

        {loadError ? (
          <p role="alert" className="text-sm text-danger">
            Couldn&apos;t load your friends. Refresh and try again.
          </p>
        ) : friends.length === 0 ? (
          <div className="space-y-4">
            <p className="text-sm text-muted">No friends yet.</p>
            <Link
              href="/chat/friends"
              className={buttonStyles({ variant: "secondary" })}
            >
              Find friends
            </Link>
          </div>
        ) : (
          <NewChatForm friends={friends} />
        )}
      </section>
    </AppShell>
  );
}
