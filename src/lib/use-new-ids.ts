"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Returns the ids added after the first render, for a one-off 150ms fade.
 * Existing rows on first load are never marked, so a cold page does not
 * animate every row.
 */
export function useNewIds(ids: string[], initialIds: string[]) {
  const seen = useRef<Set<string> | null>(null);
  const timer = useRef<number | null>(null);
  const [fresh, setFresh] = useState<Set<string>>(new Set());

  if (seen.current === null) {
    seen.current = new Set(initialIds);
  }

  useEffect(() => {
    const currentSeen = seen.current;

    if (!currentSeen) {
      return;
    }

    const added = ids.filter((id) => !currentSeen.has(id));

    for (const id of ids) {
      currentSeen.add(id);
    }

    if (added.length === 0) {
      return;
    }

    setFresh((previous) => new Set([...previous, ...added]));

    if (timer.current !== null) {
      window.clearTimeout(timer.current);
    }

    timer.current = window.setTimeout(() => {
      timer.current = null;
      setFresh(new Set());
    }, 170);
  }, [ids]);

  useEffect(() => {
    return () => {
      if (timer.current !== null) {
        window.clearTimeout(timer.current);
      }
    };
  }, []);

  return fresh;
}
