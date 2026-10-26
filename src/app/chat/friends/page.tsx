import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AppShell, getAuthenticatedUser } from "@/components/app-shell";
import { AddFriendButton } from "@/components/chat/add-friend-button";
import { FriendRequestActions } from "@/components/chat/friend-request-actions";
import { StartChatButton } from "@/components/chat/start-chat-button";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
            className="mb-6 inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-text transition-opacity duration-200 ease-out hover:opacity-80"
          >
            <ArrowLeft size={24} strokeWidth={1.75} aria-hidden="true" />
            Chat
          </Link>
          <h1 className="text-[22px] font-bold leading-tight text-text">
            Friends
          </h1>
        </div>

        <form method="get" className="flex items-center gap-2">
          <Input
            id="friend-search"
            name="q"
            type="search"
            defaultValue={query}
            autoComplete="off"
            placeholder="Search by name or username"
            aria-label="Search by name or username"
            pill
            className="min-w-0 flex-1"
          />
          <Button type="submit" variant="secondary" className="shrink-0">
            Search
          </Button>
        </form>

        {friendshipError && (
          <p role="alert" className="text-sm text-danger">
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
                    className="flex min-h-14 items-center gap-3 border-b border-line py-3"
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
                  className="flex min-h-14 items-center gap-3 border-b border-line py-3"
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
                  className="flex min-h-14 items-center gap-3 border-b border-line py-3"
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
      <Avatar
        src={person.avatarUrl}
        initial={person.initial}
        size={40}
      />

      <div className="min-w-0 flex-1">
        <p className="truncate text-[15px] font-semibold text-text">
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
      className="flex min-w-0 flex-1 items-center gap-3 transition-opacity duration-200 ease-out hover:opacity-80"
    >
      {content}
    </Link>
  );
}
