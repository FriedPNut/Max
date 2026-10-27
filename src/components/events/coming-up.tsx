"use client";

import Link from "next/link";
import { LocalTime } from "@/components/local-time";
import { Card } from "@/components/ui";
import type { EventListItem } from "@/lib/events";
import { localDayKey } from "@/lib/local-day";
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
  onWayEtas = {},
}: {
  items: EventListItem[];
  onWayEtas?: Record<string, string>;
}) {
  if (items.length === 0) return null;

  return (
    <Card>
    <section aria-labelledby="coming-up-heading" className="p-4">
      <h2 id="coming-up-heading" className="text-lg font-semibold text-text">
        Coming up
      </h2>
      <ul className="mt-2 divide-y divide-line">
        {items.map((event) => (
          <li key={event.id}>
            <Link
              href={`/events/${event.id}`}
              className="flex min-h-11 items-center justify-between gap-3 py-2"
            >
              <span className="min-w-0 break-words text-base font-semibold text-text">
                {event.title}
              </span>
              <span className="shrink-0 text-sm text-muted">
                {onWayEtas[event.id] ? (
                  <>On my way · {onWayEtas[event.id]}</>
                ) : (
                  <>
                    <LocalDayLabel iso={event.starts_at} />
                    <LocalTime iso={event.starts_at} format="time" />
                  </>
                )}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
    </Card>
  );
}
