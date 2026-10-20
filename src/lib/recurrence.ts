import type { Recurrence } from "@/lib/events";

export const MAX_OCCURRENCES = 26;

export type DateParts = {
  year: number;
  /** 0-based, matching Date. */
  month: number;
  day: number;
};

function pad(value: number) {
  return String(value).padStart(2, "0");
}

export function makeDateKey(year: number, month: number, day: number) {
  return `${year}-${pad(month + 1)}-${pad(day)}`;
}

export function parseDateKey(key: string): DateParts | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key);

  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]) - 1;
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month, day));

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month ||
    date.getUTCDate() !== day
  ) {
    return null;
  }

  return { year, month, day };
}

export function addDaysToDateKey(key: string, days: number) {
  const parts = parseDateKey(key);

  if (!parts) {
    return "";
  }

  const date = new Date(
    Date.UTC(parts.year, parts.month, parts.day + days)
  );

  return makeDateKey(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate()
  );
}

/** Eight weeks out, used as the form's default end date. */
export function defaultUntilDateKey(startKey: string) {
  return addDaysToDateKey(startKey, 56);
}

export function generateOccurrenceDateKeys(
  startKey: string,
  untilKey: string,
  recurrence: Recurrence
) {
  const start = parseDateKey(startKey);
  const until = parseDateKey(untilKey);

  if (!start || !until) {
    return [];
  }

  if (recurrence === "none") {
    return [startKey];
  }

  if (untilKey < startKey) {
    return [];
  }

  const keys: string[] = [];

  if (recurrence === "monthly") {
    for (let offset = 0; keys.length < MAX_OCCURRENCES; offset += 1) {
      const monthStart = new Date(
        Date.UTC(start.year, start.month + offset, 1)
      );
      const year = monthStart.getUTCFullYear();
      const month = monthStart.getUTCMonth();
      const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
      const key = makeDateKey(year, month, Math.min(start.day, lastDay));

      if (key > untilKey) {
        break;
      }

      keys.push(key);
    }

    return keys;
  }

  const stepDays = recurrence === "weekly" ? 7 : 14;

  for (let offset = 0; keys.length < MAX_OCCURRENCES; offset += 1) {
    const key = addDaysToDateKey(startKey, offset * stepDays);

    if (!key || key > untilKey) {
      break;
    }

    keys.push(key);
  }

  return keys;
}

export function isValidTimeZone(timeZone: string) {
  if (!timeZone) {
    return false;
  }

  try {
    new Intl.DateTimeFormat("en-US", { timeZone });
    return true;
  } catch {
    return false;
  }
}

function timeZoneOffsetMs(timeZone: string, date: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const values: Record<string, string> = {};

  for (const part of parts) {
    if (part.type !== "literal") {
      values[part.type] = part.value;
    }
  }

  const hour = values.hour === "24" ? "00" : values.hour;
  const asUtc = Date.UTC(
    Number(values.year),
    Number(values.month) - 1,
    Number(values.day),
    Number(hour),
    Number(values.minute),
    Number(values.second)
  );

  return asUtc - date.getTime();
}

/**
 * Turns a local calendar date and wall-clock time into a UTC ISO instant for
 * the given IANA time zone. Each occurrence is converted independently, so a
 * 7 PM event stays at 7 PM across daylight saving changes.
 */
export function zonedDateTimeToUtc(
  dateKey: string,
  timeValue: string,
  timeZone: string
) {
  const dateParts = parseDateKey(dateKey);
  const timeMatch = /^(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(timeValue);

  if (!dateParts || !timeMatch || !isValidTimeZone(timeZone)) {
    return null;
  }

  const hour = Number(timeMatch[1]);
  const minute = Number(timeMatch[2]);
  const second = Number(timeMatch[3] ?? "0");

  if (hour > 23 || minute > 59 || second > 59) {
    return null;
  }

  const wallClock = Date.UTC(
    dateParts.year,
    dateParts.month,
    dateParts.day,
    hour,
    minute,
    second
  );
  const firstOffset = timeZoneOffsetMs(timeZone, new Date(wallClock));

  if (!Number.isFinite(firstOffset)) {
    return null;
  }

  let result = new Date(wallClock - firstOffset);
  const secondOffset = timeZoneOffsetMs(timeZone, result);

  if (Number.isFinite(secondOffset) && secondOffset !== firstOffset) {
    result = new Date(wallClock - secondOffset);
  }

  return result.toISOString();
}
