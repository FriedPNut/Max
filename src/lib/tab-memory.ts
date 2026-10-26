import { TABS, type TabKey } from "@/lib/tabs";

type TabMemory = Record<TabKey, { path: string; scroll: number }>;

export type PendingNavigation = {
  path: string;
  scroll: number;
  direction: -1 | 0 | 1;
  at: number;
};

const STORAGE_KEY = "max:tab-memory:v1";

function defaults(): TabMemory {
  return TABS.reduce((memory, tab) => {
    memory[tab.key] = { path: tab.root, scroll: 0 };
    return memory;
  }, {} as TabMemory);
}

let cache: TabMemory | null = null;
let pending: PendingNavigation | null = null;
let lastPersist = 0;

function readCache(): TabMemory {
  if (cache) {
    return cache;
  }

  cache = defaults();

  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    const stored = raw ? (JSON.parse(raw) as Partial<TabMemory>) : null;

    for (const tab of TABS) {
      const entry = stored?.[tab.key];

      if (
        entry &&
        typeof entry.path === "string" &&
        entry.path.startsWith("/") &&
        typeof entry.scroll === "number" &&
        Number.isFinite(entry.scroll)
      ) {
        cache[tab.key] = {
          path: entry.path,
          scroll: Math.max(0, entry.scroll),
        };
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

export function getTabMemory(): TabMemory {
  return readCache();
}

export function rememberTabPage(tab: TabKey, path: string, scroll: number) {
  const memory = readCache();
  const nextScroll = Math.max(0, Math.round(scroll));

  if (memory[tab].path === path && memory[tab].scroll === nextScroll) {
    return;
  }

  memory[tab] = { path, scroll: nextScroll };
  persist(false);
}

export function resetTabToRoot(tab: TabKey) {
  const root = TABS.find((entry) => entry.key === tab)?.root ?? "/events";
  rememberTabPage(tab, root, 0);
  persist(true);
}

export function setPendingNavigation(
  path: string,
  scroll: number,
  direction: -1 | 0 | 1
) {
  pending = { path, scroll: Math.max(0, scroll), direction, at: Date.now() };
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

export function flushTabMemory() {
  persist(true);
}
