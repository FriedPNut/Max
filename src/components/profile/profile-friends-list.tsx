import Link from "next/link";
import { Avatar } from "@/components/ui";
import { OnlineDot } from "@/components/presence-provider";
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
          className="flex min-h-14 items-center gap-3 border-b border-line py-3"
        >
          <span className="relative block shrink-0">
            {friend.username ? (
              <Link
                href={`/u/${encodeURIComponent(friend.username)}`}
                aria-label={`View ${friend.name}'s profile`}
                className="block transition-opacity duration-200 ease-out hover:opacity-80"
              >
                <Avatar
                  src={friend.avatarUrl}
                  initial={friend.initial}
                  size={40}
                />
              </Link>
            ) : (
              <Avatar
                src={friend.avatarUrl}
                initial={friend.initial}
                size={40}
              />
            )}
            <OnlineDot userId={friend.id} />
          </span>

          <div className="min-w-0 flex-1">
            {friend.username ? (
              <Link
                href={`/u/${encodeURIComponent(friend.username)}`}
                className="block truncate text-[15px] font-semibold text-text transition-opacity duration-200 ease-out hover:opacity-70"
              >
                {friend.name}
              </Link>
            ) : (
              <p className="truncate text-[15px] font-semibold text-text">
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
