"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  loadOnThisDayAction,
  type OnThisDayRange,
  type OnThisDayYear,
} from "@/app/actions/on-this-day";
import { Button, Card } from "@/components/ui";

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
    let isDismissed = false;

    try {
      isDismissed = window.localStorage.getItem(DISMISS_KEY) === todayKey;
    } catch {
      // Storage can be unavailable when cookies are blocked; still show the card.
    }

    setDismissed(isDismissed);

    if (isDismissed) {
      return;
    }

    let cancelled = false;

    loadOnThisDayAction(buildRanges(now))
      .then((result) => {
        if (!cancelled) {
          setItems(result);
        }
      })
      .catch(() => {
        // A failed lookup should never take down the feed.
      });

    return () => {
      cancelled = true;
    };
  }, [currentYear]);

  function dismiss() {
    try {
      window.localStorage.setItem(DISMISS_KEY, localDayKey(new Date()));
    } catch {
      // Dismiss for this visit even if the preference cannot be saved.
    }

    setDismissed(true);
  }

  if (dismissed || items.length === 0) {
    return null;
  }

  const thisYear = new Date().getFullYear();

  return (
    <Card
      aria-label="On this day"
      className="space-y-4 p-4"
      role="region"
    >
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-text">On this day</h2>
        <Button variant="text" size="sm" onClick={dismiss}>
          Dismiss
        </Button>
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
                  href={`/feed/${post.id}`}
                  className="press-row flex items-center gap-3 rounded-lg transition-colors duration-200 ease-out hover:bg-surface-2"
                >
                  {post.imageUrl ? (
                    <img draggable={false}
                      src={post.imageUrl}
                      alt={post.caption || "Your photo"}
                      loading="lazy"
                      className="h-14 w-14 shrink-0 rounded-lg bg-surface-2 object-cover"
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
                  className="flex min-h-11 items-center text-base text-text transition-colors duration-200 ease-out hover:text-muted"
                >
                  <span className="min-w-0 truncate">{event.title}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </Card>
  );
}
