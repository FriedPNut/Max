import Link from "next/link";
import { Avatar } from "@/components/ui";
import {
  nameInitial,
  profileDisplayName,
  type ProfileRecord,
  type ProfileStats,
} from "@/lib/profile";

export function ProfileHeader({
  profile,
  avatarUrl,
  stats,
  friendsHref,
  children,
}: {
  profile: ProfileRecord;
  avatarUrl: string | null;
  stats: ProfileStats;
  friendsHref?: string;
  children: React.ReactNode;
}) {
  const name = profileDisplayName(profile);

  return (
    <section>
      <div className="flex items-center gap-4">
        <Avatar src={avatarUrl} initial={nameInitial(name)} size={96} />

        <div className="min-w-0 flex-1">
          <h1 className="truncate text-sm font-bold leading-snug text-text">
            {name}
          </h1>
          <div className="mt-2 grid grid-cols-3 gap-1">
            <Stat value={stats.posts} label="posts" />
            <Stat value={stats.friends} label="friends" href={friendsHref} />
            <Stat value={stats.events} label="events" />
          </div>
        </div>
      </div>

      <div className="mt-3">
        {profile.bio && (
          <p className="selectable whitespace-pre-wrap break-words text-[15px] text-text">
            {profile.bio}
          </p>
        )}
        {!profile.username && (
          <p className="mt-0.5 text-sm text-muted">No username yet</p>
        )}
      </div>

      <div className="mt-4 flex items-stretch gap-2 [&>*]:min-w-0 [&>*]:flex-1">
        {children}
      </div>
    </section>
  );
}

function Stat({
  value,
  label,
  href,
}: {
  value: number;
  label: string;
  href?: string;
}) {
  const content = (
    <>
      <span className="text-lg font-bold leading-tight text-text">{value}</span>
      <span className="text-sm leading-tight text-muted">{label}</span>
    </>
  );

  if (href) {
    return (
      <Link
        href={href}
        className="flex min-h-11 flex-col items-center justify-center rounded-lg transition-colors duration-200 ease-out hover:bg-surface-2"
      >
        {content}
      </Link>
    );
  }

  return (
    <div className="flex min-h-11 flex-col items-center justify-center">
      {content}
    </div>
  );
}
