export type TabKey = "events" | "chat" | "post" | "profile";

export type TabDefinition = {
  key: TabKey;
  label: string;
  /** A tab always navigates to its root, never to a remembered deep page. */
  root: string;
  /** Pages owned by this tab. Shared pages such as /u/[username] own none. */
  matches: (pathname: string) => boolean;
};

function isPath(pathname: string, path: string) {
  return pathname === path || pathname.startsWith(`${path}/`);
}

/**
 * The one place the tab bar gets its answer from: the current pathname. There
 * is no remembered "origin tab" any more, so the highlight can never disagree
 * with the URL, and a shared page (/u/name, /notifications) highlights nothing.
 */
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
    matches: (pathname) =>
      isPath(pathname, "/chat") || isPath(pathname, "/people"),
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

/** The four pages where horizontal swipes switch tabs. */
export function isRootTabPath(pathname: string): boolean {
  return TABS.some((tab) => tab.root === pathname);
}

/**
 * Screens that fill the window and keep the tab bar out of the way: auth, the
 * composers, conversations and their info screens.
 */
const FULL_SCREEN_PATHS: readonly RegExp[] = [
  /^\/login$/,
  /^\/welcome$/,
  /^\/chat\/new$/,
  /^\/chat\/(?!friends$|new$)[^/]+(\/.*)?$/,
  /^\/feed\/new$/,
  /^\/events\/new$/,
  /^\/events\/[^/]+\/edit$/,
  /^\/me\/edit$/,
  /^\/wrapped\/[^/]+$/,
];

export function isFullScreenPath(pathname: string): boolean {
  return FULL_SCREEN_PATHS.some((pattern) => pattern.test(pathname));
}

/**
 * An open conversation owns the whole window: it is its own fixed, non-
 * scrolling frame, so the page scroller steps out of the way entirely.
 */
export function isImmersivePath(pathname: string): boolean {
  return /^\/chat\/(?!friends$|new$)[^/]+$/.test(pathname);
}
