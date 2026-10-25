export type BirthdayFields = {
  birth_month: number | null;
  birth_day: number | null;
  birth_year: number | null;
};

const DAYS_IN_MONTH = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

export function isValidMonthDay(month: number, day: number) {
  return (
    Number.isInteger(month) &&
    Number.isInteger(day) &&
    month >= 1 &&
    month <= 12 &&
    day >= 1 &&
    day <= DAYS_IN_MONTH[month - 1]
  );
}

function isLeapYear(year: number) {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

// Next birthday on or after `today` (local calendar). Feb 29 falls on Feb 28
// in non-leap years.
export function nextBirthday(
  month: number,
  day: number,
  today = new Date()
): Date {
  const year = today.getFullYear();

  function occurrence(y: number) {
    const useDay = month === 2 && day === 29 && !isLeapYear(y) ? 28 : day;
    return new Date(y, month - 1, useDay);
  }

  const todayStart = new Date(year, today.getMonth(), today.getDate());
  const thisYear = occurrence(year);

  return thisYear.getTime() >= todayStart.getTime()
    ? thisYear
    : occurrence(year + 1);
}

// Whole calendar days from today to the next birthday (0 means today).
export function daysUntilBirthday(
  month: number,
  day: number,
  today = new Date()
) {
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const next = nextBirthday(month, day, today);
  return Math.round((next.getTime() - todayStart.getTime()) / (24 * 60 * 60 * 1000));
}

// Display like "Nov 12". Never includes a year.
export function formatBirthdayDate(month: number, day: number) {
  return `${MONTH_NAMES[month - 1]} ${day}`;
}

export function untilLabel(days: number) {
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  return `in ${days} days`;
}
