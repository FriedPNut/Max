import Link from "next/link";
import { AppShell, getAuthenticatedUser } from "@/components/app-shell";
import { CreatePostSheetButton } from "@/components/posts/create-sheet";
import { ProfileEvents } from "@/components/profile/profile-events";
import { ProfileHeader } from "@/components/profile/profile-header";
import { ProfilePostGrid } from "@/components/profile/profile-post-grid";
import { ProfileTabs } from "@/components/profile/profile-tabs";
import { buttonStyles } from "@/components/ui/button";
import { PersonPlusIcon, PlusIcon, PostIcon, MoreIcon } from "@/components/icons";
import { createClient } from "@/lib/supabase/server";
import { loadProfilePage } from "@/lib/profile-data";
import { profileDisplayName, type ProfileRecord } from "@/lib/profile";
import { serverNow } from "@/lib/server-now";

export default async function MePage() {
  const { user, displayName } = await getAuthenticatedUser();
  const supabase = await createClient();
  const now = await serverNow();

  const { data: profileData, error: profileError } = await supabase
    .from("profiles")
    .select("id,display_name,avatar_url,username,bio")
    .eq("id", user.id)
    .maybeSingle();

  const errorShell = (
    <AppShell userId={user.id} title="Profile">
      <p className="text-sm text-muted">
        Couldn&apos;t load your profile. Refresh and try again.
      </p>
    </AppShell>
  );

  if (profileError) {
    return errorShell;
  }

  const profile: ProfileRecord = {
    id: user.id,
    display_name: profileData?.display_name?.trim() || displayName,
    avatar_url: profileData?.avatar_url ?? null,
    username: profileData?.username ?? null,
    bio: profileData?.bio ?? null,
  };

  const result = await loadProfilePage(supabase, profile, now);

  if (result.error || !result.data) {
    return errorShell;
  }

  const data = result.data;

  return (
    <AppShell
      userId={user.id}
      actions={
        <>
          <CreatePostSheetButton />
          <Link
            href="/settings"
            aria-label="Settings"
            className="inline-flex h-11 w-11 items-center justify-center rounded-full text-text transition-colors duration-200 hover:bg-surface-2"
          >
            <MoreIcon size={24} strokeWidth={1.75} aria-hidden="true" />
          </Link>
        </>
      }
    >
      <div className="space-y-6">
        <ProfileHeader
          profile={profile}
          avatarUrl={data.avatarUrl}
          stats={data.stats}
          friendsHref="/people?filter=added"
        >
          <Link
            href="/me/edit"
            className={buttonStyles({
              variant: "secondary",
              className: "w-full",
            })}
          >
            Edit profile
          </Link>
          <Link
            href="/people"
            aria-label="Find people"
            className="inline-flex h-10 w-10 shrink-0 !flex-none items-center justify-center rounded-xl bg-surface-2 text-text transition-colors duration-200 hover:bg-surface-2/80"
          >
            <PersonPlusIcon size={20} strokeWidth={1.75} aria-hidden="true" />
          </Link>
        </ProfileHeader>

        <ProfileTabs
          postsContent={
            <ProfilePostGrid
              posts={data.posts}
              cacheUserId={user.id}
              authorName={profileDisplayName(profile)}
              authorUsername={profile.username}
              authorAvatarUrl={data.avatarUrl}
              emptyState={
                <div className="flex flex-col items-center py-10 text-center">
                  <span className="flex h-16 w-16 items-center justify-center rounded-full bg-surface-2 text-text">
                    <PostIcon size={28} strokeWidth={1.75} aria-hidden="true" />
                  </span>
                  <h2 className="mt-4 text-2xl font-bold text-text">
                    Create your first post
                  </h2>
                  <p className="mt-1 text-sm text-muted">
                    Make this space your own.
                  </p>
                  <Link
                    href="/feed/new"
                    className={buttonStyles({
                      variant: "primary",
                      className: "mt-6 w-full",
                    })}
                  >
                    <PlusIcon size={20} strokeWidth={2} aria-hidden="true" />
                    Create
                  </Link>
                </div>
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
