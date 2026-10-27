export type TabKey = "events" | "chat" | "post" | "profile";

export type TabDefinition = {
  key: TabKey;
  label: string;
  /** A tab always navigates to its root, never to a remembered deep page. */
  root: string;
  /** Pages owned by this tab; shared pages such as /u/[username] are in none. */
  matches: (pathname: string) => boolean;
};

function isPath(pathname: string, path: string) {
  return pathname === path || pathname.startsWith(`${path}/`);
}

export const TABS: readonly TabDefinition[] = [
  {
    key: "events",
    label: "Events",
    root: "/events",
    matches: (pathname) =>
      pathname === "/" ||
      isPath(pathname, "/events") ||
      isPath(pathname, "/lists") ||
      isPath(pathname, "/trips") ||
      isPath(pathname, "/best-of") ||
      pathname === "/hang" ||
      pathname === "/free" ||
      pathname === "/birthdays",
  },
  {
    key: "chat",
    label: "Chat",
    root: "/chat",
    matches: (pathname) => isPath(pathname, "/chat"),
  },
  {
    key: "post",
    label: "Post",
    root: "/feed",
    matches: (pathname) => isPath(pathname, "/feed"),
  },
  {
    key: "profile",
    label: "Profile",
    root: "/me",
    matches: (pathname) =>
      isPath(pathname, "/me") ||
      isPath(pathname, "/settings") ||
      isPath(pathname, "/wrapped") ||
      pathname === "/notifications" ||
      pathname === "/recap",
  },
];

export const TAB_KEYS: readonly TabKey[] = TABS.map((tab) => tab.key);

/** Every tab's root, safe to use as a default link target. */
export const TAB_ROOTS: Record<TabKey, string> = TABS.reduce(
  (roots, tab) => {
    roots[tab.key] = tab.root;
    return roots;
  },
  {} as Record<TabKey, string>
);

/** The tab that owns a route, or null for shared pages and unknown paths. */
export function tabForPath(pathname: string): TabKey | null {
  return TABS.find((tab) => tab.matches(pathname))?.key ?? null;
}

export function tabDefinition(key: TabKey): TabDefinition {
  return TABS.find((tab) => tab.key === key) as TabDefinition;
}

export function tabRoot(key: TabKey): string {
  return tabDefinition(key).root;
}

export function isTabPath(key: TabKey, pathname: string): boolean {
  return tabDefinition(key).matches(pathname);
}

/** The four pages where horizontal swipes switch tabs. */
export function isRootTabPath(pathname: string): boolean {
  return TABS.some((tab) => tab.root === pathname);
}

/**
 * The tab a shared page should highlight: whichever tab the person was in
 * before they opened it. Module memory only, so a refresh or deep link starts
 * unknown and highlights nothing.
 */
let originTab: TabKey | null = null;

export function setOriginTab(tab: TabKey | null) {
  if (tab) {
    originTab = tab;
  }
}

export function getOriginTab(): TabKey | null {
  return originTab;
}

export function clearOriginTab() {
  originTab = null;
}
