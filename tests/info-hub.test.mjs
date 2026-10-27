import assert from "node:assert/strict";
import test from "node:test";

import {
  daysUntilBirthday,
  formatBirthdayDate,
  isValidMonthDay,
  nextBirthday,
  untilLabel,
} from "../src/lib/birthdays.ts";
import { countdownLabel, dateKey, parseDateKey } from "../src/lib/trips.ts";

test("29 February is a real birthday and 30 February is not", () => {
  assert.equal(isValidMonthDay(2, 29), true);
  assert.equal(isValidMonthDay(2, 30), false);
  assert.equal(isValidMonthDay(4, 31), false);
  assert.equal(isValidMonthDay(12, 31), true);
});

test("a 29 February birthday falls on 28 February in a non-leap year", () => {
  const date = nextBirthday(2, 29, new Date(2026, 0, 15));
  assert.equal(dateKey(date), "2026-02-28");

  const leap = nextBirthday(2, 29, new Date(2028, 0, 15));
  assert.equal(dateKey(leap), "2028-02-29");
});

test("birthday countdowns are whole local days", () => {
  const today = new Date(2026, 9, 26);

  assert.equal(daysUntilBirthday(10, 26, today), 0);
  assert.equal(daysUntilBirthday(10, 27, today), 1);
  assert.equal(daysUntilBirthday(11, 7, today), 12);
  assert.equal(untilLabel(0), "Today");
  assert.equal(untilLabel(1), "Tomorrow");
  assert.equal(untilLabel(12), "in 12 days");
});

test("a birthday label is a day and month, never a year", () => {
  assert.equal(formatBirthdayDate(11, 7), "Nov 7");
  assert.equal(/\d{4}/.test(formatBirthdayDate(2, 29)), false);
});

test("trip countdowns read like the rest of the app", () => {
  const now = new Date(2026, 9, 26);

  assert.equal(countdownLabel("2026-11-07", "2026-11-10", now), "in 12 days");
  assert.equal(countdownLabel("2026-10-27", "2026-10-30", now), "tomorrow");
  assert.equal(countdownLabel("2026-10-26", "2026-10-30", now), "today");
  assert.equal(countdownLabel("2026-10-24", "2026-10-28", now), "under way");
  assert.equal(countdownLabel("2026-10-01", "2026-10-05", now), null);
});

test("trip date keys parse as local calendar days", () => {
  const date = parseDateKey("2026-11-07");
  assert.equal(date.getFullYear(), 2026);
  assert.equal(date.getMonth(), 10);
  assert.equal(date.getDate(), 7);
  assert.equal(dateKey(date), "2026-11-07");
});
