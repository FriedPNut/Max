// Week and year math in the viewer's own timezone. Everything here is pure so
// the server actions and the UI agree on what "this week" means.

export const WEEKDAY_LABELS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
] as const;

export type RecapTopPost = {
  id: string;
  caption: string | null;
  authorName: string;
  likeCount: number;
  imageUrl: string | null;
};

export type RecapNextEvent = {
  id: string;
  title: string;
  location: string;
  startsAt: string;
};

export type RecapWeek = {
  weekStartKey: string;
  weekEndKey: string;
  weekLabel: string;
  eventsAttended: number;
  newEvents: number;
  posts: number;
  photos: number;
  messages: number;
  newFriends: number;
  topPost: RecapTopPost | null;
  busiestDay: { label: string; count: number } | null;
  nextWeek: RecapNextEvent[];
  isCurrentWeek: boolean;
  isEmpty: boolean;
};

export type WrappedCard = {
  id: string;
  label: string;
  value: string;
  detail?: string;
  imageUrl?: string | null;
  closing?: boolean;
};

export type WrappedYear = {
  year: number;
  cards: WrappedCard[];
};

function safeTimeZone(timeZone: string) {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone }).format(new Date());
    return timeZone;
  } catch {
    return "UTC";
  }
}

export function parseDateKey(key: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key);

  if (!match) {
    return null;
  }

  return { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) };
}

function keyFromParts(year: number, month: number, day: number) {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

// Calendar date of an instant, as the viewer sees it.
export function zonedDateKey(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: safeTimeZone(timeZone),
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const get = (type: string) =>
    Number(parts.find((part) => part.type === type)?.value);

  return keyFromParts(get("year"), get("month"), get("day"));
}

export function addDaysToKey(key: string, days: number) {
  const parts = parseDateKey(key);

  if (!parts) {
    return key;
  }

  const shifted = new Date(Date.UTC(parts.year, parts.month - 1, parts.day + days));

  return keyFromParts(
    shifted.getUTCFullYear(),
    shifted.getUTCMonth() + 1,
    shifted.getUTCDate()
  );
}

// Monday is 0, Sunday is 6.
export function weekdayOfKey(key: string) {
  const parts = parseDateKey(key);

  if (!parts) {
    return 0;
  }

  return (new Date(Date.UTC(parts.year, parts.month - 1, parts.day)).getUTCDay() + 6) % 7;
}

export function startOfWeekKey(key: string) {
  return addDaysToKey(key, -weekdayOfKey(key));
}

function offsetMs(instant: number, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: safeTimeZone(timeZone),
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(new Date(instant));
  const get = (type: string) =>
    Number(parts.find((part) => part.type === type)?.value);

  return (
    Date.UTC(
      get("year"),
      get("month") - 1,
      get("day"),
      get("hour") % 24,
      get("minute"),
      get("second")
    ) - instant
  );
}

// Midnight at the start of a local calendar day, as a UTC instant.
// The offset is solved rather than guessed, because a noon probe lands on the
// wrong side of a DST change and would shift the boundary by an hour.
export function zonedStartOfDay(key: string, timeZone: string) {
  const parts = parseDateKey(key);

  if (!parts) {
    return new Date(0);
  }

  const midnightUtc = Date.UTC(parts.year, parts.month - 1, parts.day);
  let candidate = midnightUtc - offsetMs(midnightUtc, timeZone);

  // Converge on the offset that is actually in effect at local midnight.
  for (let pass = 0; pass < 3; pass += 1) {
    const next = midnightUtc - offsetMs(candidate, timeZone);

    if (next === candidate) {
      break;
    }

    candidate = next;
  }

  return new Date(candidate);
}

export type WeekRange = {
  weekStartKey: string;
  weekEndKey: string;
  startIso: string;
  endIso: string;
};

export function weekRangeFor(weekStartKey: string, timeZone: string): WeekRange {
  const start = startOfWeekKey(weekStartKey);

  return {
    weekStartKey: start,
    weekEndKey: addDaysToKey(start, 6),
    startIso: zonedStartOfDay(start, timeZone).toISOString(),
    endIso: zonedStartOfDay(addDaysToKey(start, 7), timeZone).toISOString(),
  };
}

export function currentWeekStartKey(timeZone: string, now = new Date()) {
  return startOfWeekKey(zonedDateKey(now, timeZone));
}

// Wrapped opens December 1 of the current year. Past years are always open,
// and ?preview=1 opens the current year early for testing.
export function isWrappedAvailable({
  year,
  now = new Date(),
  preview = false,
}: {
  year: number;
  now?: Date;
  preview?: boolean;
}) {
  const currentYear = now.getFullYear();
  const afterDecemberFirst = now.getMonth() >= 11;

  return (
    Number.isInteger(year) &&
    year >= 2000 &&
    year <= currentYear &&
    (year < currentYear || afterDecemberFirst || preview)
  );
}

function utcDay(key: string) {
  const parts = parseDateKey(key);
  return parts ? new Date(Date.UTC(parts.year, parts.month - 1, parts.day)) : null;
}

export function formatWeekRange(startKey: string, endKey: string) {
  const start = utcDay(startKey);
  const end = utcDay(endKey);

  if (!start || !end) {
    return "";
  }

  const month = new Intl.DateTimeFormat("en-US", { month: "short", timeZone: "UTC" });
  const full = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });

  return `${month.format(start)} ${start.getUTCDate()} – ${full.format(end)}`;
}

export function formatEventDay(iso: string, timeZone: string) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: safeTimeZone(timeZone),
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(new Date(iso));
}

export function formatEventTime(iso: string, timeZone: string) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: safeTimeZone(timeZone),
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}

export function monthLabel(iso: string, timeZone: string) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: safeTimeZone(timeZone),
    month: "long",
  }).format(new Date(iso));
}

export function monthIndex(iso: string, timeZone: string) {
  return Number(
    new Intl.DateTimeFormat("en-US", {
      timeZone: safeTimeZone(timeZone),
      month: "numeric",
    }).format(new Date(iso))
  );
}

export function weekdayLabel(iso: string, timeZone: string) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: safeTimeZone(timeZone),
    weekday: "long",
  }).format(new Date(iso));
}
