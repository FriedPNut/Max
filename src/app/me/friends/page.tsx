import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AppShell, getAuthenticatedUser } from "@/components/app-shell";
import { ProfileFriendsList } from "@/components/profile/profile-friends-list";
import { createClient } from "@/lib/supabase/server";
import { loadProfileFriends } from "@/lib/profile-data";

export default async function MyFriendsPage() {
  const { user } = await getAuthenticatedUser();
  const supabase = await createClient();
  const result = await loadProfileFriends(supabase, user.id);

  return (
    <AppShell>
      <section className="space-y-6">
        <div>
          <Link
            href="/me"
            className="mb-6 inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-text transition-opacity duration-200 ease-out hover:opacity-80"
          >
            <ArrowLeft size={24} strokeWidth={1.75} aria-hidden="true" />
            Profile
          </Link>

          <h1 className="text-[22px] font-bold leading-tight text-text">
            Friends
          </h1>
        </div>

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
