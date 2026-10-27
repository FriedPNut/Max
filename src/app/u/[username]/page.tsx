import { notFound, redirect } from "next/navigation";
import { Ellipsis } from "lucide-react";
import { AppShell, getAuthenticatedUser } from "@/components/app-shell";
import { ProfileBackButton } from "@/components/profile/profile-back-button";
import { ProfileEvents } from "@/components/profile/profile-events";
import { ProfileFriendButton } from "@/components/profile/profile-friend-button";
import { ProfileHeader } from "@/components/profile/profile-header";
import { ProfileMessageButton } from "@/components/profile/profile-message-button";
import { ProfilePostGrid } from "@/components/profile/profile-post-grid";
import { ProfileTabs } from "@/components/profile/profile-tabs";
import { createClient } from "@/lib/supabase/server";
import {
  normalizeUsername,
  profileDisplayName,
  type ProfileRecord,
} from "@/lib/profile";
import {
  loadProfilePage,
  loadProfileRelationship,
} from "@/lib/profile-data";

export default async function PublicProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username: rawUsername } = await params;
  const username = normalizeUsername(rawUsername);
  const { user } = await getAuthenticatedUser();
  const supabase = await createClient();

  if (!username) {
    notFound();
  }

  const { data: profileData, error: profileError } = await supabase
    .from("profiles")
    .select("id,display_name,avatar_url,username,bio")
    .eq("username", username)
    .maybeSingle();

  if (profileError) {
    return (
      <AppShell left={<ProfileBackButton />}>
        <p className="text-sm text-muted">
          Couldn&apos;t load this profile. Refresh and try again.
        </p>
      </AppShell>
    );
  }

  if (!profileData) {
    notFound();
  }

  const profile = profileData as ProfileRecord;

  if (profile.id === user.id) {
    redirect("/me");
  }

  const [result, relationship] = await Promise.all([
    loadProfilePage(supabase, profile),
    loadProfileRelationship(supabase, user.id, profile.id),
  ]);

  if (result.error || !result.data) {
    return (
      <AppShell left={<ProfileBackButton />}>
        <p className="text-sm text-muted">
          {result.error ?? "Couldn't load this profile. Refresh and try again."}
        </p>
      </AppShell>
    );
  }

  const data = result.data;

  return (
    <AppShell
      left={<ProfileBackButton />}
      title={profile.username ? `@${profile.username}` : undefined}
      actions={
        <span
          aria-label="More"
          className="inline-flex h-11 w-11 items-center justify-center rounded-full text-text"
        >
          <Ellipsis size={24} strokeWidth={1.75} aria-hidden="true" />
        </span>
      }
    >
      <div key={profile.id} className="space-y-6">
        <ProfileHeader
          profile={profile}
          avatarUrl={data.avatarUrl}
          stats={data.stats}
          friendsHref={
            profile.username
              ? `/u/${encodeURIComponent(profile.username)}/friends`
              : undefined
          }
        >
          <ProfileFriendButton
            profileId={profile.id}
            name={profileDisplayName(profile)}
            initialRelationship={relationship}
          />

          {relationship === "friend" && (
            <ProfileMessageButton friendId={profile.id} />
          )}
        </ProfileHeader>

        <ProfileTabs
          postsContent={
            <ProfilePostGrid
              posts={data.posts}
              authorName={profileDisplayName(profile)}
              authorUsername={profile.username}
              authorAvatarUrl={data.avatarUrl}
              emptyState={
                <p className="py-8 text-center text-sm text-muted">
                  No posts yet.
                </p>
              }
            />
          }
          eventsContent={
            <ProfileEvents
              upcoming={data.upcomingEvents}
              past={data.pastEvents}
            />
          }
        />
      </div>
    </AppShell>
  );
}
