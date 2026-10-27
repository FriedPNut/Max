"use client";

import { useNow } from "@/lib/use-now";
import { countdownLabel } from "@/lib/trips";

/**
 * "· in 5 days" for a trip. Only the browser produces it: the server renders
 * the dates themselves and never a relative label.
 */
export function TripCountdown({
  startKey,
  endKey,
}: {
  startKey: string;
  endKey: string;
}) {
  const now = useNow();
  const label =
    now === null ? null : countdownLabel(startKey, endKey, new Date(now));

  if (!label) {
    return null;
  }

  return (
    <>
      {" · "}
      {label}
    </>
  );
}
