"use client";

/**
 * The one client data cache. Screens read their last copy from here on mount so
 * a reopen shows content instead of a skeleton, then the server answer replaces
 * it quietly. Every key carries the account id, and clearClientData() wipes the
 * whole family at logout, so one device never mixes two people.
 */
const PREFIX = "max-cache:";
const MAX_BYTES = 180_000;
// Signed photo URLs only live 24 hours, so cached rows expire well before that.
const MAX_AGE_MS = 6 * 60 * 60 * 1000;

function storageKey(userId: string, name: string) {
  return `${PREFIX}${userId}:${name}`;
}

export function readCache<T>(userId: string, name: string): T | null {
  if (typeof window === "undefined" || !userId) {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(storageKey(userId, name));

    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as { at: number; value: T };

    if (!parsed || typeof parsed.at !== "number") {
      return null;
    }

    if (Date.now() - parsed.at > MAX_AGE_MS) {
      window.localStorage.removeItem(storageKey(userId, name));
      return null;
    }

    return parsed.value;
  } catch {
    return null;
  }
}

export function writeCache<T>(userId: string, name: string, value: T) {
  if (typeof window === "undefined" || !userId) {
    return;
  }

  try {
    const raw = JSON.stringify({ at: Date.now(), value });

    // First pages only: a big list is not worth the parse on every open.
    if (raw.length > MAX_BYTES) {
      return;
    }

    window.localStorage.setItem(storageKey(userId, name), raw);
  } catch {
    // Storage can be full or blocked; the live data is still on screen.
  }
}
