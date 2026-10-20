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
            className="inline-flex min-h-11 items-center gap-1.5 text-sm text-muted hover:text-text transition-colors duration-150 ease-out mb-6"
          >
            <ArrowLeft size={20} strokeWidth={1.5} aria-hidden="true" />
            Profile
          </Link>

          <h1 className="text-[28px] font-semibold leading-tight text-text">
            Friends
          </h1>
        </div>

        {result.error ? (
          <p className="text-sm text-muted">
            Couldn&apos;t load your friends. Refresh and try again.
          </p>
        ) : (
          <ProfileFriendsList friends={result.friends} />
        )}
      </section>
    </AppShell>
  );
}
