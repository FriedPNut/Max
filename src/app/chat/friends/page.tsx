import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AppShell, getAuthenticatedUser } from "@/components/app-shell";
import { AddFriendButton } from "@/components/chat/add-friend-button";
import { FriendRequestActions } from "@/components/chat/friend-request-actions";
import { StartChatButton } from "@/components/chat/start-chat-button";
import { ProfileAvatar } from "@/components/profile/profile-avatar";
import { createClient } from "@/lib/supabase/server";
import { resolveProfileAvatarUrls } from "@/lib/profile-data";
import {
  nameInitial,
  profileName,
  type ChatProfile,
  type FriendListItem,
  type FriendRequestItem,
  type FriendshipRecord,
  type SearchPerson,
} from "@/lib/chat";

const searchInputClass =
  "w-full bg-surface text-text placeholder:text-muted border border-line rounded-lg px-3 py-3 text-base leading-snug focus:outline-2 focus:outline-offset-0 focus:outline-text";

export default async function FriendsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q = "" } = await searchParams;
  const { user } = await getAuthenticatedUser();
  const supabase = await createClient();
  const query = q.trim();

  const { data: friendshipData, error: friendshipError } = await supabase
    .from("friendships")
    .select("id,requester_id,addressee_id,status,created_at")
    .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`);

  const friendships = (friendshipData ?? []) as FriendshipRecord[];

  const relatedIds = [
    ...new Set(
      friendships
        .flatMap((friendship) => [
          friendship.requester_id,
          friendship.addressee_id,
        ])
        .filter((id) => id !== user.id)
    ),
  ];

  let relatedProfiles: ChatProfile[] = [];

  if (relatedIds.length > 0) {
    const { data } = await supabase
      .from("profiles")
      .select("id,display_name,avatar_url,username")
      .in("id", relatedIds);

    relatedProfiles = (data ?? []) as ChatProfile[];
  }

  const searchTerm = query.replace(/[%,()"'*]/g, " ").trim();
  let searchProfiles: ChatProfile[] = [];

  if (searchTerm) {
    const { data } = await supabase
      .from("profiles")
      .select("id,display_name,avatar_url,username")
      .neq("id", user.id)
      .or(
        `display_name.ilike.%${searchTerm}%,username.ilike.%${searchTerm}%`
      )
      .limit(20);

    searchProfiles = (data ?? []) as ChatProfile[];
  }

  const profilesById = new Map<string, ChatProfile>();

  for (const profile of [...relatedProfiles, ...searchProfiles]) {
    profilesById.set(profile.id, profile);
  }

  const avatarUrls = await resolveProfileAvatarUrls(supabase, [
    ...profilesById.values(),
  ]);

  function toFriend(userId: string): FriendListItem {
    const profile = profilesById.get(userId);
    const name = profileName(profile);

    return {
      id: userId,
      name,
      username: profile?.username?.trim() || null,
      initial: nameInitial(name),
      avatarUrl: avatarUrls.get(userId) ?? null,
    };
  }

  const incoming: FriendRequestItem[] = friendships
    .filter(
      (friendship) =>
        friendship.addressee_id === user.id && friendship.status === "pending"
    )
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )
    .map((friendship) => ({
      ...toFriend(friendship.requester_id),
      friendshipId: friendship.id,
      createdAt: friendship.created_at,
    }));

  const sent: FriendRequestItem[] = friendships
    .filter(
      (friendship) =>
        friendship.requester_id === user.id && friendship.status === "pending"
    )
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )
    .map((friendship) => ({
      ...toFriend(friendship.addressee_id),
      friendshipId: friendship.id,
      createdAt: friendship.created_at,
    }));

  const friendIds = [
    ...new Set(
      friendships
        .filter((friendship) => friendship.status === "accepted")
        .map((friendship) =>
          friendship.requester_id === user.id
            ? friendship.addressee_id
            : friendship.requester_id
        )
    ),
  ];

  const friends = friendIds
    .map(toFriend)
    .sort((a, b) => a.name.localeCompare(b.name));

  const relationByUserId = new Map<
    string,
    { relation: SearchPerson["relation"]; friendshipId: string }
  >();

  for (const friendship of friendships) {
    const otherId =
      friendship.requester_id === user.id
        ? friendship.addressee_id
        : friendship.requester_id;
    const relation =
      friendship.status === "accepted"
        ? "friend"
        : friendship.requester_id === user.id
        ? "sent"
        : "incoming";

    relationByUserId.set(otherId, {
      relation,
      friendshipId: friendship.id,
    });
  }

  const results: SearchPerson[] = searchProfiles
    .map((profile) => {
      const relationship = relationByUserId.get(profile.id);

      return {
        ...toFriend(profile.id),
        relation: relationship?.relation ?? "none",
        friendshipId: relationship?.friendshipId ?? null,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <AppShell>
      <section className="space-y-8">
        <div>
          <Link
            href="/chat"
            className="inline-flex min-h-11 items-center gap-1.5 text-sm text-muted hover:text-text transition-colors duration-150 ease-out mb-6"
          >
            <ArrowLeft size={20} strokeWidth={1.5} aria-hidden="true" />
            Chat
          </Link>
          <h1 className="text-[28px] font-semibold leading-tight text-text">
            Friends
          </h1>
        </div>

        <form method="get" className="space-y-3">
          <div>
            <label htmlFor="friend-search" className="block text-sm text-muted mb-2">
              Search by name or username
            </label>
            <div className="flex gap-2">
              <input
                id="friend-search"
                name="q"
                type="search"
                defaultValue={query}
                autoComplete="off"
                placeholder="Maya or maya"
                className={searchInputClass}
              />
              <button
                type="submit"
                className="shrink-0 min-h-11 px-4 py-3 rounded-lg border border-line bg-transparent text-text font-sans font-medium text-sm transition-colors duration-150 ease-out hover:bg-surface cursor-pointer"
              >
                Search
              </button>
            </div>
          </div>
        </form>

        {friendshipError && (
          <p className="text-sm text-muted">
            Couldn&apos;t load your friends. Refresh and try again.
          </p>
        )}

        {searchTerm && (
          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-text">Results</h2>

            {results.length === 0 ? (
              <p className="text-sm text-muted">No one found.</p>
            ) : (
              <div className="border-t border-line">
                {results.map((person) => (
                  <div
                    key={person.id}
                    className="flex items-center gap-3 border-b border-line py-3"
                  >
                    <PersonIdentity person={person} />

                    {person.relation === "none" ? (
                      <AddFriendButton userId={person.id} />
                    ) : person.relation === "incoming" && person.friendshipId ? (
                      <FriendRequestActions
                        friendshipId={person.friendshipId}
                      />
                    ) : (
                      <span className="shrink-0 text-sm text-muted">
                        {person.relation === "friend"
                          ? "Friends"
                          : person.relation === "sent"
                          ? "Request sent"
                          : "Request pending"}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-text">
            Incoming requests
          </h2>

          {incoming.length === 0 ? (
            <p className="text-sm text-muted">No incoming requests.</p>
          ) : (
            <div className="border-t border-line">
              {incoming.map((request) => (
                <div
                  key={request.friendshipId}
                  className="flex items-center gap-3 border-b border-line py-3"
                >
                  <PersonIdentity person={request} />

                  <FriendRequestActions friendshipId={request.friendshipId} />
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-text">Sent requests</h2>

          {sent.length === 0 ? (
            <p className="text-sm text-muted">No sent requests.</p>
          ) : (
            <div className="border-t border-line">
              {sent.map((request) => (
                <div
                  key={request.friendshipId}
                  className="flex items-center gap-3 border-b border-line py-3"
                >
                  <PersonIdentity person={request} />

                  <span className="shrink-0 text-sm text-muted">
                    Request sent
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-text">My friends</h2>

          {friends.length === 0 ? (
            <p className="text-sm text-muted">No friends yet.</p>
          ) : (
            <div className="border-t border-line">
              {friends.map((friend) => (
                <StartChatButton key={friend.id} friend={friend} />
              ))}
            </div>
          )}
        </section>
      </section>
    </AppShell>
  );
}

function PersonIdentity({ person }: { person: FriendListItem }) {
  const content = (
    <>
      <ProfileAvatar
        src={person.avatarUrl}
        initial={person.initial}
        size={40}
      />

      <div className="min-w-0 flex-1">
        <p className="truncate text-base font-medium text-text">
          {person.name}
        </p>
        {person.username && (
          <p className="mt-0.5 truncate text-sm text-muted">
            @{person.username}
          </p>
        )}
      </div>
    </>
  );

  if (!person.username) {
    return (
      <div className="flex min-w-0 flex-1 items-center gap-3">{content}</div>
    );
  }

  return (
    <Link
      href={`/u/${encodeURIComponent(person.username)}`}
      className="flex min-w-0 flex-1 items-center gap-3 transition-opacity duration-150 ease-out hover:opacity-80"
    >
      {content}
    </Link>
  );
}
