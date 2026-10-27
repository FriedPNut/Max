"use client";

import { absoluteTimeLabel, relativeTime } from "@/lib/posts";
import { useNow } from "@/lib/use-now";

/**
 * The one place relative time is rendered. The server shows the absolute date
 * ("Mar 4"), the browser swaps in "4h" after mount and keeps it fresh, so no
 * Server Component ever reads the current time.
 */
export function RelativeTime({
  iso,
  className,
}: {
  iso: string;
  className?: string;
}) {
  const now = useNow();
  const text = now === null ? absoluteTimeLabel(iso) : relativeTime(iso, now);

  return (
    <time dateTime={iso} className={className}>
      {text}
    </time>
  );
}
