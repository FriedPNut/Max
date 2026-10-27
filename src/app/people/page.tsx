import Link from "next/link";
import { FastLink } from "@/components/ui/fast-link";
import { AppShell, getAuthenticatedUser } from "@/components/app-shell";
import { FriendToggle } from "@/components/friends/friend-toggle";
import { Avatar } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";
import { resolveProfileAvatarUrls } from "@/lib/profile-data";

type PeopleFilter = "all" | "added";

type ProfileRow = {
  id: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
};

export default async function PeoplePage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const { filter: filterParam } = await searchParams;
  const filter: PeopleFilter = filterParam === "added" ? "added" : "all";
  const { user } = await getAuthenticatedUser();
  const supabase = await createClient();

  const [profilesResult, friendshipsResult] = await Promise.all([
    supabase
      .from("profiles")
      .select("id,display_name,username,avatar_url")
      .neq("id", user.id)
      .order("display_name", { ascending: true })
      .limit(200),
    supabase
      .from("friendships")
      .select("requester_id,addressee_id")
      .eq("status", "accepted")
      .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`),
  ]);

  const friendIds = new Set(
    ((friendshipsResult.data ?? []) as {
      requester_id: string;
      addressee_id: string;
    }[]).map((row) =>
      row.requester_id === user.id ? row.addressee_id : row.requester_id
    )
  );

  const profiles = ((profilesResult.data ?? []) as ProfileRow[]).filter(
    (profile) => filter === "all" || friendIds.has(profile.id)
  );
  const avatarUrls = await resolveProfileAvatarUrls(supabase, profiles);
  const loadError = profilesResult.error ?? friendshipsResult.error;

  const chipClass = (active: boolean) =>
    `inline-flex min-h-9 items-center rounded-full px-3.5 text-sm font-semibold transition-colors duration-200 ease-out ${
      active ? "bg-text text-background" : "bg-surface-2 text-text"
    }`;

  return (
    <AppShell title="People">
      <section className="space-y-6">
        <nav aria-label="People filter" className="flex gap-2">
          <Link
            href="/people"
            aria-current={filter === "all" ? "page" : undefined}
            className={chipClass(filter === "all")}
          >
            All
          </Link>
          <Link
            href="/people?filter=added"
            aria-current={filter === "added" ? "page" : undefined}
            className={chipClass(filter === "added")}
          >
            Added
          </Link>
        </nav>

        {loadError ? (
          <p role="alert" className="text-sm text-danger">
            Couldn&apos;t load people. Refresh and try again.
          </p>
        ) : profiles.length === 0 ? (
          <p className="text-sm text-muted">
            {filter === "added"
              ? "You haven’t added anyone yet."
              : "No one else is here yet."}
          </p>
        ) : (
          <ul className="border-t border-line">
            {profiles.map((profile) => {
              const name =
                profile.display_name?.trim() ||
                profile.username?.trim() ||
                "A friend";

              return (
                <li
                  key={profile.id}
                  className="cv-auto flex min-h-14 items-center gap-3 border-b border-line py-3"
                >
                  {profile.username ? (
                    <FastLink
                      href={`/u/${encodeURIComponent(profile.username)}`}
                      aria-label={`View ${name}'s profile`}
                      className="shrink-0 transition-opacity duration-200 ease-out hover:opacity-80"
                    >
                      <Avatar
                        src={avatarUrls.get(profile.id) ?? null}
                        initial={name.charAt(0)}
                        size={40}
                      />
                    </FastLink>
                  ) : (
                    <Avatar
                      src={avatarUrls.get(profile.id) ?? null}
                      initial={name.charAt(0)}
                      size={40}
                    />
                  )}

                  <div className="min-w-0 flex-1">
                    {profile.username ? (
                      <FastLink
                        href={`/u/${encodeURIComponent(profile.username)}`}
                        className="block truncate text-[15px] font-semibold text-text transition-opacity duration-200 ease-out hover:opacity-70"
                      >
                        {name}
                      </FastLink>
                    ) : (
                      <p className="truncate text-[15px] font-semibold text-text">
                        {name}
                      </p>
                    )}

                    {profile.username && (
                      <p className="mt-0.5 truncate text-sm text-muted">
                        @{profile.username}
                      </p>
                    )}
                  </div>

                  <FriendToggle
                    friendId={profile.id}
                    name={name}
                    initialFriend={friendIds.has(profile.id)}
                  />
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </AppShell>
  );
}
