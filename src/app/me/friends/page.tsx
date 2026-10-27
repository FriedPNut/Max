import Link from "next/link";
import { AppShell, getAuthenticatedUser } from "@/components/app-shell";
import { ProfileFriendsList } from "@/components/profile/profile-friends-list";
import { createClient } from "@/lib/supabase/server";
import { loadProfileFriends } from "@/lib/profile-data";

export default async function MyFriendsPage() {
  const { user } = await getAuthenticatedUser();
  const supabase = await createClient();
  const result = await loadProfileFriends(supabase, user.id);

  return (
    <AppShell title="Friends">
      <section className="space-y-6">

        {result.error ? (
          <p role="alert" className="text-sm text-danger">
            Couldn&apos;t load your friends. Refresh and try again.
          </p>
        ) : (
          <ProfileFriendsList friends={result.friends} />
        )}
      </section>
    </AppShell>
  );
}
