import { notFound, redirect } from "next/navigation";
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
      <AppShell actions={<ProfileBackButton />}>
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
      <AppShell actions={<ProfileBackButton />}>
        <p className="text-sm text-muted">
          {result.error ?? "Couldn't load this profile. Refresh and try again."}
        </p>
      </AppShell>
    );
  }

  const data = result.data;

  return (
    <AppShell actions={<ProfileBackButton />}>
      <div className="space-y-8">
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
          <div className="space-y-2">
            <ProfileFriendButton
              profileId={profile.id}
              initialRelationship={relationship}
            />

            {relationship === "friend" && (
              <ProfileMessageButton friendId={profile.id} />
            )}
          </div>
        </ProfileHeader>

        <ProfileTabs
          postsContent={<ProfilePostGrid posts={data.posts} />}
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
