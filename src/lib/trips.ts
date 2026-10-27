export const TRIP_TABS = [
  "overview",
  "itinerary",
  "packing",
  "links",
  "costs",
  "people",
] as const;
export type TripTab = (typeof TRIP_TABS)[number];

export const TRIP_LINK_KINDS = ["lodging", "transport", "activity", "other"] as const;
export type TripLinkKind = (typeof TRIP_LINK_KINDS)[number];

export const TRIP_LINK_LABELS: Record<TripLinkKind, string> = {
  lodging: "Lodging",
  transport: "Transport",
  activity: "Activities",
  other: "Other",
};

export const TRIP_TITLE_MAX = 80;
export const TRIP_DESTINATION_MAX = 120;
export const TRIP_DESCRIPTION_MAX = 1000;

export type TripRecord = {
  id: string;
  title: string;
  destination: string | null;
  start_date: string;
  end_date: string;
  description: string | null;
  cover_path: string | null;
  created_by: string;
};

// Local calendar date (YYYY-MM-DD) for a date value, for display and comparisons.
export function dateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate()
  ).padStart(2, "0")}`;
}

// Parse a YYYY-MM-DD string as a local calendar date (not UTC midnight).
export function parseDateKey(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);

  if (!match) {
    return null;
  }

  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

// Every local calendar day from start to end, inclusive.
export function tripDays(startKey: string, endKey: string) {
  const start = parseDateKey(startKey);
  const end = parseDateKey(endKey);

  if (!start || !end || end < start) {
    return [];
  }

  const days: string[] = [];

  for (
    let day = new Date(start);
    day <= end;
    day = new Date(day.getFullYear(), day.getMonth(), day.getDate() + 1)
  ) {
    days.push(dateKey(day));
  }

  return days;
}

// Whole days from today to the trip start, in the viewer's local calendar.
export function countdownLabel(startKey: string, endKey: string, now: Date) {
  const today = parseDateKey(dateKey(now));
  const start = parseDateKey(startKey);
  const end = parseDateKey(endKey);

  if (!today || !start || !end) {
    return null;
  }

  const msPerDay = 24 * 60 * 60 * 1000;
  const untilStart = Math.round((start.getTime() - today.getTime()) / msPerDay);

  if (untilStart > 1) {
    return `in ${untilStart} days`;
  }

  if (untilStart === 1) {
    return "tomorrow";
  }

  if (untilStart === 0) {
    return "today";
  }

  return end.getTime() >= today.getTime() ? "under way" : null;
}
