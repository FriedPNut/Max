"use client";

import { useEffect, useState } from "react";

/**
 * A clock that only exists on the client. Null during the server render and the
 * hydration render, then the current time, refreshed on an interval and when
 * the tab comes back into view.
 *
 * Anything shown from this value is therefore stable and absolute on the
 * server, which is what the Cache Components rules require of prerendered
 * output: no server render ever reads the clock.
 */
export function useNow(intervalMs = 60_000): number | null {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    let timer = 0;

    const tick = () => setNow(Date.now());
    tick();
    timer = window.setInterval(tick, intervalMs);

    const onVisible = () => {
      if (document.visibilityState === "visible") {
        tick();
      }
    };

    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);

    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, [intervalMs]);

  return now;
}
