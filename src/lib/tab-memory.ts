import { TAB_KEYS, type TabKey } from "@/lib/tabs";

export type PendingNavigation = {
  /** Always a tab root; a stale path never applies to another page. */
  path: string;
  scroll: number;
  direction: -1 | 0 | 1;
  at: number;
};

// Only scroll positions live here. A tab's page is always its root.
const STORAGE_KEY = "max:tab-scroll:v2";

type TabScroll = Record<TabKey, number>;

let cache: TabScroll | null = null;
let pending: PendingNavigation | null = null;
let lastPersist = 0;

function defaults(): TabScroll {
  return TAB_KEYS.reduce((scroll, key) => {
    scroll[key] = 0;
    return scroll;
  }, {} as TabScroll);
}

function readCache(): TabScroll {
  if (cache) {
    return cache;
  }

  cache = defaults();

  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    const stored = raw ? (JSON.parse(raw) as Partial<TabScroll>) : null;

    for (const key of TAB_KEYS) {
      const value = stored?.[key];

      if (typeof value === "number" && Number.isFinite(value)) {
        cache[key] = Math.max(0, Math.round(value));
      }
    }
  } catch {
    // Storage can be unavailable; the in-memory copy still works.
  }

  return cache;
}

function persist(force: boolean) {
  const now = Date.now();

  if (!force && now - lastPersist < 400) {
    return;
  }

  lastPersist = now;

  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(readCache()));
  } catch {
    // Ignore quota and private-mode failures.
  }
}

export function getTabScroll(key: TabKey): number {
  return readCache()[key];
}

export function rememberTabScroll(key: TabKey, scroll: number) {
  const memory = readCache();
  const next = Math.max(0, Math.round(scroll));

  if (memory[key] === next) {
    return;
  }

  memory[key] = next;
  persist(false);
}

export function setPendingNavigation(
  path: string,
  scroll: number,
  direction: -1 | 0 | 1
) {
  pending = { path, scroll: Math.max(0, scroll), direction, at: Date.now() };
}

export function clearPendingNavigation() {
  pending = null;
}

export function consumePendingNavigation(
  pathname: string
): PendingNavigation | null {
  if (!pending) {
    return null;
  }

  if (Date.now() - pending.at > 6000) {
    pending = null;
    return null;
  }

  if (pending.path !== pathname) {
    return null;
  }

  const next = pending;
  pending = null;
  return next;
}
