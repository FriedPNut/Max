import Link from "next/link";
import { ProfileAvatar } from "@/components/profile/profile-avatar";
import type { ProfileFriend } from "@/lib/profile";

export function ProfileFriendsList({ friends }: { friends: ProfileFriend[] }) {
  if (friends.length === 0) {
    return <p className="text-sm text-muted">No friends yet.</p>;
  }

  return (
    <ul className="border-t border-line">
      {friends.map((friend) => (
        <li
          key={friend.id}
          className="flex items-center gap-3 border-b border-line py-3"
        >
          {friend.username ? (
            <Link
              href={`/u/${encodeURIComponent(friend.username)}`}
              aria-label={`View ${friend.name}'s profile`}
              className="shrink-0 transition-opacity duration-150 ease-out hover:opacity-80"
            >
              <ProfileAvatar
                src={friend.avatarUrl}
                initial={friend.initial}
                size={40}
              />
            </Link>
          ) : (
            <ProfileAvatar
              src={friend.avatarUrl}
              initial={friend.initial}
              size={40}
            />
          )}

          <div className="min-w-0 flex-1">
            {friend.username ? (
              <Link
                href={`/u/${encodeURIComponent(friend.username)}`}
                className="block truncate text-base font-medium text-text transition-opacity duration-150 ease-out hover:opacity-80"
              >
                {friend.name}
              </Link>
            ) : (
              <p className="truncate text-base font-medium text-text">
                {friend.name}
              </p>
            )}

            {friend.username && (
              <p className="mt-0.5 truncate text-sm text-muted">
                @{friend.username}
              </p>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}
