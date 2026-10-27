"use client";

import { useSyncExternalStore } from "react";
import { useToday } from "@/lib/use-today";

type TimeFormat = "card" | "date" | "time";

const subscribe = () => () => {};

function formatValue(
  iso: string,
  format: TimeFormat,
  timeZone?: string,
  now: Date = new Date()
) {
  const date = new Date(iso);

  if (Number.isNaN(date.getTime())) {
    return "Time to be decided";
  }

  const base = timeZone ? { timeZone } : undefined;

  if (format === "time") {
    return new Intl.DateTimeFormat("en-US", {
      ...base,
      hour: "numeric",
      minute: "2-digit",
    }).format(date);
  }

  if (format === "date") {
    return new Intl.DateTimeFormat("en-US", {
      ...base,
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    }).format(date);
  }

  const day = new Intl.DateTimeFormat("en-US", {
    ...base,
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(date);
  const year = new Intl.DateTimeFormat("en-US", {
    ...base,
    year: "numeric",
  }).format(date);
  const currentYear = new Intl.DateTimeFormat("en-US", {
    ...base,
    year: "numeric",
  }).format(now);
  const time = new Intl.DateTimeFormat("en-US", {
    ...base,
    hour: "numeric",
    minute: "2-digit",
  }).format(date);

  return `${day}${year === currentYear ? "" : `, ${year}`} · ${time}`;
}

export function LocalTime({
  iso,
  format = "card",
  className,
}: {
  iso: string;
  format?: TimeFormat;
  className?: string;
}) {
  // The shared day re-renders at local midnight, so the year suffix can't go
  // stale in a long-lived tab.
  const today = useToday();

  // The server renders a UTC fallback so hydration stays stable, then the
  // browser swaps in the viewer's own timezone after mount.
  const text = useSyncExternalStore(
    subscribe,
    () => formatValue(iso, format, undefined, today ?? new Date()),
    () => formatValue(iso, format, "UTC")
  );

  return (
    <time dateTime={iso} className={className}>
      {text}
    </time>
  );
}
