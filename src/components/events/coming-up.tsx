"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { LocalTime } from "@/components/local-time";
import { Card } from "@/components/ui";
import type { EventListItem } from "@/lib/events";

const subscribe = () => () => {};

function dayKey(date: Date, timeZone?: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const values = new Map(parts.map((part) => [part.type, part.value]));
  return `${values.get("year")}-${values.get("month")}-${values.get("day")}`;
}

function labelFor(iso: string, timeZone?: string) {
  const now = new Date();
  const eventDate = new Date(iso);
  const todayKey = dayKey(now, timeZone);
  const eventKey = dayKey(eventDate, timeZone);

  return eventKey === todayKey ? "Today" : "Tomorrow";
}

function LocalDayLabel({ iso }: { iso: string }) {
  const label = useSyncExternalStore(
    subscribe,
    () => labelFor(iso),
    () => labelFor(iso, "UTC")
  );

  return <>{label}</>;
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
                    <LocalDayLabel iso={event.starts_at} /> at{" "}
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
