"use client";

import { useCallback, useEffect, useState } from "react";
import type {
  InfoBirthdaysResult,
  InfoListsResult,
  InfoTripsResult,
} from "@/app/actions/info-hub";

export type InfoTab = "lists" | "trips" | "birthdays";

type TabResult = {
  lists: InfoListsResult;
  trips: InfoTripsResult;
  birthdays: InfoBirthdaysResult;
};

/*
 * Module memory, not storage: a tab is read the first time it is opened and
 * kept until the app is closed. Reopening the sheet never pays for it again.
 */
const cache: Partial<TabResult> = {};
const inflight = new Map<InfoTab, Promise<unknown>>();

/** Loads a tab the first time it is enabled, then serves the session copy. */
export function useInfoQuery<K extends InfoTab>(
  key: K,
  loader: () => Promise<TabResult[K]>,
  enabled = true
) {
  const [data, setData] = useState<TabResult[K] | null>(() => cache[key] ?? null);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);

  const run = useCallback(async (force = false) => {
    const cached = cache[key];

    if (cached && !force) {
      setData(cached);
      return;
    }

    const existing = inflight.get(key) as Promise<TabResult[K]> | undefined;

    if (existing) {
      setData(await existing);
      return;
    }

    setLoading(true);
    setFailed(false);

    const promise = loader();
    inflight.set(key, promise);

    try {
      const result = await promise;
      cache[key] = result;
      setData(result);
    } catch {
      setFailed(true);
    } finally {
      inflight.delete(key);
      setLoading(false);
    }
  }, [key, loader]);

  useEffect(() => {
    if (enabled) {
      void run();
    }
  }, [enabled, run]);

  /** Updates the tab and the session copy together, for optimistic rows. */
  const mutate = useCallback(
    (updater: (current: TabResult[K] | null) => TabResult[K]) => {
      setData((current) => {
        const next = updater(current);
        cache[key] = next;
        return next;
      });
    },
    [key]
  );

  /** Bypasses the session copy, for after something was created. */
  const refresh = useCallback(() => {
    void run(true);
  }, [run]);

  return { data, loading, failed, mutate, refresh };
}
