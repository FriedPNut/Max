"use client";

/**
 * Everything a person leaves behind on a device. Theme is the only device
 * setting, so it survives; every other localStorage key is per account.
 */
const DEVICE_STORAGE_KEYS = new Set(["max-theme"]);

/** Auth cookies are managed by Supabase; never expire them from here. */
const PRESERVED_COOKIE_PREFIXES = ["sb-"];

function expireCookie(name: string) {
  for (const path of ["/", window.location.pathname]) {
    document.cookie = `${name}=; path=${path}; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT; samesite=lax`;
  }
}

/**
 * Wipes session state and every per-account key and cookie. Called only after
 * the session itself is gone or has changed to another person, so the next
 * screen can never show the previous account's data.
 */
export function clearClientData() {
  try {
    window.sessionStorage.clear();
  } catch {
    // Storage can be blocked; there is nothing to clear then.
  }

  try {
    const stale: string[] = [];

    for (let index = 0; index < window.localStorage.length; index += 1) {
      const key = window.localStorage.key(index);

      if (key && !DEVICE_STORAGE_KEYS.has(key)) {
        stale.push(key);
      }
    }

    for (const key of stale) {
      window.localStorage.removeItem(key);
    }
  } catch {
    // Storage can be blocked; there is nothing to clear then.
  }

  try {
    const names = document.cookie
      .split(";")
      .map((entry) => entry.split("=")[0]?.trim())
      .filter((name): name is string => Boolean(name));

    for (const name of names) {
      if (PRESERVED_COOKIE_PREFIXES.some((prefix) => name.startsWith(prefix))) {
        continue;
      }

      expireCookie(name);
    }
  } catch {
    // A cookie-less browser has nothing to clear.
  }
}
