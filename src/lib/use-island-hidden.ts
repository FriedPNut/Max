"use client";

import { useEffect, useSyncExternalStore } from "react";

let hiddenCount = 0;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) {
    listener();
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot() {
  return hiddenCount > 0;
}

function getServerSnapshot() {
  return false;
}

/**
 * Hides the island bar while `active` is true. Used by full-screen photo
 * viewers and every bottom sheet.
 */
export function useIslandHidden(active: boolean) {
  useEffect(() => {
    if (!active) {
      return;
    }

    hiddenCount += 1;
    emit();

    return () => {
      hiddenCount = Math.max(0, hiddenCount - 1);
      emit();
    };
  }, [active]);
}

export function useIslandHiddenState(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
