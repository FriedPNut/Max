import Link from "next/link";
import { ProfileAvatar } from "@/components/profile/profile-avatar";
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
    <section className="space-y-6">
      <div className="flex items-center gap-5">
        <ProfileAvatar src={avatarUrl} initial={nameInitial(name)} />

        <div className="min-w-0 flex-1">
          <h1 className="text-[28px] font-semibold leading-tight text-text break-words">
            {name}
          </h1>

          {profile.username ? (
            <p className="mt-1 text-sm text-muted">@{profile.username}</p>
          ) : (
            <p className="mt-1 text-sm text-muted">No username yet</p>
          )}

          {profile.bio && (
            <p className="mt-3 whitespace-pre-wrap break-words text-base text-text">
              {profile.bio}
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 border-y border-line py-4">
        <Stat value={stats.posts} label="Posts" />
        <Stat value={stats.friends} label="Friends" href={friendsHref} />
        <Stat value={stats.events} label="Events" />
      </div>

      {children}
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
      <span className="text-lg font-semibold text-text">{value}</span>
      <span className="mt-0.5 text-sm text-muted">{label}</span>
    </>
  );

  if (href) {
    return (
      <Link
        href={href}
        className="flex flex-col items-center rounded-lg transition-colors duration-150 ease-out hover:bg-surface"
      >
        {content}
      </Link>
    );
  }

  return <div className="flex flex-col items-center">{content}</div>;
}
