"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  loadOnThisDayAction,
  type OnThisDayRange,
  type OnThisDayYear,
} from "@/app/actions/on-this-day";

const DISMISS_KEY = "on-this-day-dismissed";
const LOOKBACK_YEARS = 5;

function localDayKey(date: Date) {
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
}

function buildRanges(now: Date): OnThisDayRange[] {
  const ranges: OnThisDayRange[] = [];

  for (let years = 1; years <= LOOKBACK_YEARS; years++) {
    const year = now.getFullYear() - years;
    const start = new Date(year, now.getMonth(), now.getDate());
    const end = new Date(year, now.getMonth(), now.getDate() + 1);

    ranges.push({
      year,
      start: start.toISOString(),
      end: end.toISOString(),
    });
  }

  return ranges;
}

function yearsAgoLabel(years: number) {
  return years === 1 ? "1 year ago" : `${years} years ago`;
}

export function OnThisDayCard({ currentYear }: { currentYear?: number }) {
  const [items, setItems] = useState<OnThisDayYear[]>([]);
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    const now = new Date();
    const todayKey = localDayKey(now);
    const isDismissed =
      window.localStorage.getItem(DISMISS_KEY) === todayKey;

    setDismissed(isDismissed);

    if (isDismissed) {
      return;
    }

    let cancelled = false;

    loadOnThisDayAction(buildRanges(now)).then((result) => {
      if (!cancelled) {
        setItems(result);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [currentYear]);

  function dismiss() {
    window.localStorage.setItem(DISMISS_KEY, localDayKey(new Date()));
    setDismissed(true);
  }

  if (dismissed || items.length === 0) {
    return null;
  }

  const thisYear = new Date().getFullYear();

  return (
    <section
      aria-label="On this day"
      className="rounded-lg border border-border bg-surface p-4 space-y-4"
    >
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-text">On this day</h2>
        <button
          type="button"
          onClick={dismiss}
          className="min-h-11 px-3 text-sm text-muted transition-colors duration-150 ease-out hover:text-text cursor-pointer"
        >
          Dismiss
        </button>
      </div>

      {items.map((group) => (
        <div key={group.year} className="space-y-2">
          <p className="text-sm text-muted">
            {yearsAgoLabel(thisYear - group.year)}
          </p>

          <ul className="space-y-2">
            {group.posts.map((post) => (
              <li key={post.id}>
                <Link
                  href="/feed"
                  className="flex items-center gap-3 rounded-lg transition-colors duration-150 ease-out hover:bg-background"
                >
                  {post.imageUrl ? (
                    <img
                      src={post.imageUrl}
                      alt={post.caption || "Your photo"}
                      loading="lazy"
                      className="h-14 w-14 shrink-0 rounded-lg object-cover bg-background"
                    />
                  ) : null}
                  <span className="min-w-0 truncate text-base text-text">
                    {post.caption || "Photo"}
                  </span>
                </Link>
              </li>
            ))}

            {group.events.map((event) => (
              <li key={event.id}>
                <Link
                  href={`/events/${event.id}`}
                  className="flex min-h-11 items-center text-base text-text transition-colors duration-150 ease-out hover:text-muted"
                >
                  <span className="min-w-0 truncate">{event.title}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </section>
  );
}
