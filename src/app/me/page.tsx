import Link from "next/link";
import { AppShell, getAuthenticatedUser } from "@/components/app-shell";
import { ProfileEvents } from "@/components/profile/profile-events";
import { ProfileHeader } from "@/components/profile/profile-header";
import { ProfileMenu } from "@/components/profile/profile-menu";
import { ProfilePostGrid } from "@/components/profile/profile-post-grid";
import { ProfileTabs } from "@/components/profile/profile-tabs";
import { createClient } from "@/lib/supabase/server";
import { loadProfilePage } from "@/lib/profile-data";
import type { ProfileRecord } from "@/lib/profile";

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
      <div className="space-y-8">
        <ProfileHeader
          profile={profile}
          avatarUrl={data.avatarUrl}
          stats={data.stats}
          friendsHref="/me/friends"
        >
          <Link
            href="/me/edit"
            className="flex min-h-11 w-full items-center justify-center rounded-lg border border-line bg-transparent px-4 py-3 text-sm font-medium text-text transition-colors duration-150 ease-out hover:bg-surface"
          >
            Edit profile
          </Link>
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
