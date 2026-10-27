import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AppShell, getAuthenticatedUser } from "@/components/app-shell";
import { ProfileFriendsList } from "@/components/profile/profile-friends-list";
import { createClient } from "@/lib/supabase/server";
import {
  normalizeUsername,
  profileDisplayName,
  type ProfileRecord,
} from "@/lib/profile";
import { loadProfileFriends } from "@/lib/profile-data";

export default async function PublicFriendsPage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username: rawUsername } = await params;
  const username = normalizeUsername(rawUsername);
  const { user } = await getAuthenticatedUser();

  if (!username) {
    notFound();
  }

  const supabase = await createClient();
  const { data: profileData, error: profileError } = await supabase
    .from("profiles")
    .select("id,display_name,avatar_url,username,bio")
    .eq("username", username)
    .maybeSingle();

  if (profileError) {
    return (
      <AppShell>
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
    redirect("/people?filter=added");
  }

  const result = await loadProfileFriends(supabase, profile.id);
  const name = profileDisplayName(profile);

  return (
    <AppShell title="Friends">
      <section key={profile.id} className="space-y-6">
        <p className="text-sm text-muted">@{username}</p>

        {result.error ? (
          <p role="alert" className="text-sm text-danger">
            Couldn&apos;t load these friends. Refresh and try again.
          </p>
        ) : (
          <ProfileFriendsList friends={result.friends} />
        )}
      </section>
    </AppShell>
  );
}
