import { zonedDateKey, zonedStartOfDay } from "@/lib/recap";

export const BEST_OF_BUCKET = "photos";
export const BEST_OF_SIGNED_URL_SECONDS = 60 * 60 * 6;

export type BestOfPost = {
  id: string;
  caption: string | null;
  imageUrl: string | null;
  authorName: string;
  authorUsername: string | null;
  createdAt: string;
  voteCount: number;
  firstVoteAt: string | null;
  isMine: boolean;
  hasMyVote: boolean;
};

export type BestOfMonth = {
  monthKey: string;
  monthLabel: string;
  closesLabel: string;
  lastDayKey: string;
  isCurrentMonth: boolean;
  posts: BestOfPost[];
  topThree: BestOfPost[];
  totalVotes: number;
  hasMyPost: boolean;
};

function pad(value: number) {
  return String(value).padStart(2, "0");
}

export function parseMonthKey(key: string) {
  const match = /^(\d{4})-(\d{2})$/.exec(key);

  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);

  if (month < 1 || month > 12 || year < 2000 || year > 9999) {
    return null;
  }

  return { year, month };
}

export function monthKeyForDateKey(dateKey: string) {
  return dateKey.slice(0, 7);
}

export function currentMonthKey(timeZone: string, now = new Date()) {
  return monthKeyForDateKey(zonedDateKey(now, timeZone));
}

export function addMonthsToKey(key: string, delta: number) {
  const parts = parseMonthKey(key);

  if (!parts) {
    return key;
  }

  const shifted = new Date(Date.UTC(parts.year, parts.month - 1 + delta, 1));

  return `${shifted.getUTCFullYear()}-${pad(shifted.getUTCMonth() + 1)}`;
}

export function lastDayInMonth(key: string) {
  const parts = parseMonthKey(key);

  if (!parts) {
    return `${key}-01`;
  }

  const days = new Date(Date.UTC(parts.year, parts.month, 0)).getUTCDate();

  return `${key}-${pad(days)}`;
}

// Month boundaries as UTC instants for the viewer's own calendar.
export function monthRangeFor(key: string, timeZone: string) {
  return {
    startIso: zonedStartOfDay(`${key}-01`, timeZone).toISOString(),
    endIso: zonedStartOfDay(`${addMonthsToKey(key, 1)}-01`, timeZone).toISOString(),
    lastDayKey: lastDayInMonth(key),
  };
}

export function formatMonthLabel(key: string) {
  const parts = parseMonthKey(key);

  if (!parts) {
    return key;
  }

  return new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    month: "long",
    year: "numeric",
  }).format(new Date(Date.UTC(parts.year, parts.month - 1, 1)));
}

export function formatClosesLabel(lastDayKey: string) {
  const parts = /^(\d{4})-(\d{2})-(\d{2})$/.exec(lastDayKey);

  if (!parts) {
    return "";
  }

  return new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    month: "short",
    day: "numeric",
  }).format(
    new Date(Date.UTC(Number(parts[1]), Number(parts[2]) - 1, Number(parts[3])))
  );
}

export type BestOfBanner = { href: string; label: string };

// The slim Post-tab banner: vote during a month's last 7 days, results during
// the first 3 days of the next month, nothing otherwise.
export function bestOfBannerFor(now = new Date()): BestOfBanner | null {
  const day = now.getDate();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();

  if (day > daysInMonth - 7) {
    return { href: "/best-of", label: "Photo of the month · vote now" };
  }

  if (day <= 3) {
    const key = `${now.getFullYear()}-${pad(now.getMonth() + 1)}`;

    return {
      href: `/best-of/${addMonthsToKey(key, -1)}`,
      label: "Photo of the month · see who won",
    };
  }

  return null;
}

// Most votes first; ties go to whoever was voted for earliest.
export function compareBestOf(a: BestOfPost, b: BestOfPost) {
  if (b.voteCount !== a.voteCount) {
    return b.voteCount - a.voteCount;
  }

  if (a.firstVoteAt !== b.firstVoteAt) {
    if (!a.firstVoteAt) {
      return 1;
    }

    if (!b.firstVoteAt) {
      return -1;
    }

    return a.firstVoteAt.localeCompare(b.firstVoteAt);
  }

  return a.createdAt.localeCompare(b.createdAt);
}

export function sortBestOf(posts: BestOfPost[]) {
  return [...posts].sort(compareBestOf);
}
