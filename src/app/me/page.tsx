import Link from "next/link";
import { AppShell, getAuthenticatedUser } from "@/components/app-shell";
import { ProfileEvents } from "@/components/profile/profile-events";
import { ProfileHeader } from "@/components/profile/profile-header";
import { ProfileMenu } from "@/components/profile/profile-menu";
import { ProfilePostGrid } from "@/components/profile/profile-post-grid";
import { ProfileShareButton } from "@/components/profile/profile-share-button";
import { ProfileTabs } from "@/components/profile/profile-tabs";
import { buttonStyles } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { loadProfilePage } from "@/lib/profile-data";
import { profileDisplayName, type ProfileRecord } from "@/lib/profile";

export default async function MePage() {
  const { user, displayName } = await getAuthenticatedUser();
  const supabase = await createClient();

  const { data: profileData, error: profileError } = await supabase
    .from("profiles")
    .select("id,display_name,avatar_url,username,bio")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    return (
      <AppShell actions={<ProfileMenu />} userId={user.id}>
        <p className="text-sm text-muted">
          Couldn&apos;t load your profile. Refresh and try again.
        </p>
      </AppShell>
    );
  }

  const profile: ProfileRecord = {
    id: user.id,
    display_name: profileData?.display_name?.trim() || displayName,
    avatar_url: profileData?.avatar_url ?? null,
    username: profileData?.username ?? null,
    bio: profileData?.bio ?? null,
  };

  const result = await loadProfilePage(supabase, profile);

  if (result.error || !result.data) {
    return (
      <AppShell actions={<ProfileMenu />} userId={user.id}>
        <p className="text-sm text-muted">
          Couldn&apos;t load your profile. Refresh and try again.
        </p>
      </AppShell>
    );
  }

  const data = result.data;

  return (
    <AppShell actions={<ProfileMenu />} userId={user.id}>
      <div className="space-y-6">
        <ProfileHeader
          profile={profile}
          avatarUrl={data.avatarUrl}
          stats={data.stats}
          friendsHref="/me/friends"
        >
          <Link
            href="/me/edit"
            className={buttonStyles({ variant: "secondary", className: "w-full" })}
          >
            Edit profile
          </Link>
          <ProfileShareButton username={profile.username} />
        </ProfileHeader>

        <ProfileTabs
          postsContent={
            <ProfilePostGrid
              posts={data.posts}
              authorName={profileDisplayName(profile)}
              authorUsername={profile.username}
              authorAvatarUrl={data.avatarUrl}
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
