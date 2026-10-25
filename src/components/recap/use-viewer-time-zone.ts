"use client";

import { useEffect, useState } from "react";

// The server does not know the viewer's zone, so the stats load once the
// browser reports it. Everything before that is a skeleton.
export function useViewerTimeZone() {
  const [timeZone, setTimeZone] = useState<string | null>(null);

  useEffect(() => {
    try {
      setTimeZone(Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC");
    } catch {
      setTimeZone("UTC");
    }
  }, []);

  return timeZone;
}
