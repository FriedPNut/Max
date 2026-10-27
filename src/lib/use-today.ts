"use client";

import { useEffect, useState } from "react";
import { msUntilNextLocalMidnight, startOfLocalDay } from "@/lib/local-day";

/**
 * The viewer's local day, re-read at every local midnight and whenever the tab
 * becomes visible again. Null until mounted so the server render never guesses
 * a timezone.
 */
export function useToday(): Date | null {
  const [today, setToday] = useState<Date | null>(null);

  useEffect(() => {
    let timer = 0;

    const tick = () => {
      const next = startOfLocalDay(new Date());
      setToday((current) =>
        current && current.getTime() === next.getTime() ? current : next
      );
      window.clearTimeout(timer);
      timer = window.setTimeout(tick, msUntilNextLocalMidnight(new Date()));
    };

    tick();

    const onVisible = () => {
      if (document.visibilityState === "visible") {
        tick();
      }
    };

    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    window.addEventListener("pageshow", onVisible);

    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
      window.removeEventListener("pageshow", onVisible);
    };
  }, []);

  return today;
}
