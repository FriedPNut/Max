"use client";

import { useState } from "react";
import { updateBirthdayAction } from "@/app/actions/profile";
import { isValidMonthDay } from "@/lib/birthdays";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

// Longest possible month length, so 29 February is selectable.
const MONTH_DAY_COUNTS = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

const fieldClass =
  "w-full bg-surface text-text border border-border rounded-lg px-3 py-3 text-base leading-snug focus:outline-2 focus:outline-offset-0 focus:outline-text";
const labelClass = "block text-sm text-muted mb-2";
const buttonClass =
  "min-h-11 rounded-lg border border-border bg-transparent px-4 py-3 text-sm font-medium text-text transition-colors duration-150 ease-out hover:bg-surface cursor-pointer disabled:opacity-60 disabled:pointer-events-none";

export function BirthdayForm({
  initial,
}: {
  initial: { month: number | null; day: number | null; year: number | null };
}) {
  const [month, setMonth] = useState<number | null>(initial.month);
  const [day, setDay] = useState<number | null>(initial.day);
  const [year, setYear] = useState<string>(initial.year ? String(initial.year) : "");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const maxDay = month ? MONTH_DAY_COUNTS[month - 1] : 31;

  async function save(nextMonth: number | null, nextDay: number | null, nextYear: number | null) {
    setPending(true);
    setError(null);
    setSaved(false);
    const result = await updateBirthdayAction({ month: nextMonth, day: nextDay, year: nextYear });
    setPending(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    setMonth(nextMonth);
    setDay(nextDay);
    setYear(nextYear ? String(nextYear) : "");
    setSaved(true);
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (month === null || day === null) {
      setError("Pick a month and day, or clear the birthday.");
      return;
    }

    if (!isValidMonthDay(month, day)) {
      setError("That day isn't in that month.");
      return;
    }

    const trimmedYear = year.trim();
    const yearValue = trimmedYear ? Number(trimmedYear) : null;

    if (trimmedYear && !/^\d{4}$/.test(trimmedYear)) {
      setError("Use a four-digit year, or leave it blank.");
      return;
    }

    void save(month, day, yearValue);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 border-t border-line pt-6" noValidate>
      <div>
        <h2 className="text-lg font-semibold text-text">Birthday</h2>
        <p className="mt-1 text-sm text-muted">Optional. Friends see the day, never the year.</p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label htmlFor="birth-month" className={labelClass}>Month</label>
          <select
            id="birth-month"
            value={month ?? ""}
            disabled={pending}
            onChange={(event) => {
              const next = event.target.value ? Number(event.target.value) : null;
              setMonth(next);
              if (next && day && day > MONTH_DAY_COUNTS[next - 1]) setDay(null);
            }}
            className={fieldClass}
          >
            <option value="">Month</option>
            {MONTHS.map((name, index) => (
              <option key={name} value={index + 1}>{name}</option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="birth-day" className={labelClass}>Day</label>
          <select
            id="birth-day"
            value={day ?? ""}
            disabled={pending}
            onChange={(event) => setDay(event.target.value ? Number(event.target.value) : null)}
            className={fieldClass}
          >
            <option value="">Day</option>
            {Array.from({ length: maxDay }, (_, index) => index + 1).map((value) => (
              <option key={value} value={value}>{value}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label htmlFor="birth-year" className={labelClass}>Year (optional)</label>
        <input
          id="birth-year"
          type="text"
          inputMode="numeric"
          value={year}
          disabled={pending}
          onChange={(event) => setYear(event.target.value.replace(/\D/g, "").slice(0, 4))}
          placeholder="1994"
          className={fieldClass}
        />
        <p className="mt-1 text-sm text-muted">Only you see this. It&apos;s never shown to anyone.</p>
      </div>

      {error && <p role="alert" className="text-sm text-text">{error}</p>}
      {saved && !error && <p className="text-sm text-muted">Birthday saved.</p>}

      <div className="flex flex-wrap gap-2">
        <button type="submit" disabled={pending} className="min-h-11 rounded-lg bg-text px-4 py-3 text-sm font-medium text-background transition-opacity duration-150 ease-out hover:opacity-90 cursor-pointer disabled:opacity-60 disabled:pointer-events-none">
          {pending ? "Saving..." : "Save birthday"}
        </button>
        <button type="button" disabled={pending} onClick={() => void save(null, null, null)} className={buttonClass}>
          Clear birthday
        </button>
      </div>
    </form>
  );
}
