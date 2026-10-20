"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

/**
 * False during SSR and the first hydration render, true after hydration.
 * Lets client views render a deterministic server fallback, then switch to
 * the viewer's local date and timezone without a hydration mismatch.
 */
export function useHydrated() {
  return useSyncExternalStore(subscribe, () => true, () => false);
}
