export type CalendarView = "day" | "week" | "month";

export type DateParts = {
  year: number;
  /** 0-based, matching Date. */
  month: number;
  day: number;
};

export const WEEKDAY_LABELS = [
  "Mon",
  "Tue",
  "Wed",
  "Thu",
  "Fri",
  "Sat",
  "Sun",
];

function pad(value: number) {
  return String(value).padStart(2, "0");
}

export function parseDateKey(key: string): DateParts {
  const [year, month, day] = key.split("-").map(Number);
  return { year, month: month - 1, day };
}

export function makeDateKey(year: number, month: number, day: number) {
  return `${year}-${pad(month + 1)}-${pad(day)}`;
}

export function dateKeyFromDate(date: Date) {
  return makeDateKey(date.getFullYear(), date.getMonth(), date.getDate());
}

export function addDaysToKey(key: string, delta: number) {
  const { year, month, day } = parseDateKey(key);
  const next = new Date(Date.UTC(year, month, day + delta));
  return makeDateKey(next.getUTCFullYear(), next.getUTCMonth(), next.getUTCDate());
}

export function addMonthsToKey(key: string, delta: number) {
  const { year, month } = parseDateKey(key);
  const total = year * 12 + month + delta;
  return makeDateKey(Math.floor(total / 12), ((total % 12) + 12) % 12, 1);
}

export function daysInMonth(year: number, month: number) {
  return new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
}

export function weekdayIndexMonday(key: string) {
  const { year, month, day } = parseDateKey(key);
  return (new Date(Date.UTC(year, month, day)).getUTCDay() + 6) % 7;
}

export function startOfWeekKey(key: string) {
  return addDaysToKey(key, -weekdayIndexMonday(key));
}

export function monthGridKeys(key: string) {
  const { year, month } = parseDateKey(key);
  const total = daysInMonth(year, month);
  const cells: (string | null)[] = [];

  for (let index = 0; index < weekdayIndexMonday(makeDateKey(year, month, 1)); index += 1) {
    cells.push(null);
  }

  for (let day = 1; day <= total; day += 1) {
    cells.push(makeDateKey(year, month, day));
  }

  while (cells.length % 7 !== 0) {
    cells.push(null);
  }

  return cells;
}

function formatShortMonth(year: number, month: number) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month, 1)));
}

export function formatMonthTitle(key: string) {
  const { year, month } = parseDateKey(key);
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month, 1)));
}

export function formatWeekTitle(key: string) {
  const start = parseDateKey(startOfWeekKey(key));
  const end = parseDateKey(addDaysToKey(startOfWeekKey(key), 6));

  if (start.year !== end.year) {
    return `${formatShortMonth(start.year, start.month)} ${start.day}, ${start.year} – ${formatShortMonth(end.year, end.month)} ${end.day}, ${end.year}`;
  }

  if (start.month !== end.month) {
    return `${formatShortMonth(start.year, start.month)} ${start.day} – ${formatShortMonth(end.year, end.month)} ${end.day}`;
  }

  return `${formatShortMonth(start.year, start.month)} ${start.day} – ${end.day}`;
}

export function formatDayTitle(key: string, currentYear?: number) {
  const { year, month, day } = parseDateKey(key);
  const parts = new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month, day)));

  return currentYear === undefined || currentYear === year
    ? parts
    : `${parts}, ${year}`;
}

export function formatDayLong(key: string) {
  const { year, month, day } = parseDateKey(key);
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month, day)));
}

export function formatHourLabel(hour: number) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(2020, 0, 1, hour)));
}

export function yearOfKey(key: string) {
  return parseDateKey(key).year;
}

export function eventDateKey(iso: string) {
  const date = new Date(iso);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return dateKeyFromDate(date);
}

export function eventMinutes(iso: string) {
  const date = new Date(iso);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.getHours() * 60 + date.getMinutes();
}
