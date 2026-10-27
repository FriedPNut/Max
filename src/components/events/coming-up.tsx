"use client";

import { FastLink } from "@/components/ui/fast-link";
import { LocalTime } from "@/components/local-time";
import { Card } from "@/components/ui";
import type { EventListItem } from "@/lib/events";
import { arrivalEtaLabel, type ArrivalRecord } from "@/lib/event-arrivals";
import { localDayKey } from "@/lib/local-day";
import { useNow } from "@/lib/use-now";
import { useToday } from "@/lib/use-today";

/** Hydration-safe: nothing until the viewer's own day is known. */
function LocalDayLabel({ iso }: { iso: string }) {
  const today = useToday();

  if (!today) {
    return null;
  }

  const label =
    localDayKey(new Date(iso)) === localDayKey(today) ? "Today" : "Tomorrow";

  return <>{label} at </>;
}

export function ComingUp({
  items,
  onWayArrivals = {},
}: {
  items: EventListItem[];
  /** The rows themselves; the ETA counts down on the viewer's clock. */
  onWayArrivals?: Record<string, ArrivalRecord>;
}) {
  const now = useNow(30_000);

  if (items.length === 0) return null;

  return (
    <Card>
    <section aria-labelledby="coming-up-heading" className="p-4">
      <h2 id="coming-up-heading" className="text-lg font-semibold text-text">
        Coming up
      </h2>
      <ul className="mt-2 divide-y divide-line">
        {items.map((event) => {
          const arrival = onWayArrivals[event.id];
          const eta = arrival && now !== null ? arrivalEtaLabel(arrival, now) : null;

          return (
          <li key={event.id}>
            <FastLink
              href={`/events/${event.id}`}
              className="flex min-h-11 items-center justify-between gap-3 py-2"
            >
              <span className="min-w-0 break-words text-base font-semibold text-text">
                {event.title}
              </span>
              <span className="shrink-0 text-sm text-muted">
                {arrival ? (
                  <>On my way{eta ? ` · ${eta}` : ""}</>
                ) : (
                  <>
                    <LocalDayLabel iso={event.starts_at} />
                    <LocalTime iso={event.starts_at} format="time" />
                  </>
                )}
              </span>
            </FastLink>
          </li>
          );
        })}
      </ul>
    </section>
    </Card>
  );
}
