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
      <div className="flex items-start gap-5">
        <Avatar
          src={avatarUrl}
          initial={nameInitial(name)}
          size={88}
          className="mt-1"
        />

        <div className="grid min-w-0 flex-1 grid-cols-3 gap-1 pt-1">
          <Stat value={stats.posts} label="Posts" />
          <Stat value={stats.friends} label="Friends" href={friendsHref} />
          <Stat value={stats.events} label="Events" />
        </div>
      </div>

      {/* Reserved for the level and streak line, directly under the stats. */}
      <div aria-hidden="true" className="mt-2 min-h-5" />

      <div className="mt-1">
        <h1 className="break-words text-base font-semibold leading-snug text-text">
          {name}
        </h1>

        {profile.username ? (
          <p className="mt-0.5 truncate text-sm text-muted">
            @{profile.username}
          </p>
        ) : (
          <p className="mt-0.5 text-sm text-muted">No username yet</p>
        )}

        {profile.bio && (
          <p className="selectable mt-2 whitespace-pre-wrap break-words text-base text-text">
            {profile.bio}
          </p>
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
      <span className="text-lg font-bold leading-tight text-text">
        {value}
      </span>
      <span className="mt-0.5 text-[13px] leading-tight text-muted">
        {label}
      </span>
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
