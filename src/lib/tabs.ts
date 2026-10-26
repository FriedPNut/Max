export type TabKey = "events" | "chat" | "post" | "profile";

export type TabDefinition = {
  key: TabKey;
  label: string;
  root: string;
  matches: (pathname: string) => boolean;
};

export const TABS: readonly TabDefinition[] = [
  {
    key: "events",
    label: "Events",
    root: "/events",
    matches: (pathname) =>
      pathname === "/" ||
      pathname === "/events" ||
      pathname.startsWith("/events/"),
  },
  {
    key: "chat",
    label: "Chat",
    root: "/chat",
    matches: (pathname) => pathname === "/chat" || pathname.startsWith("/chat/"),
  },
  {
    key: "post",
    label: "Post",
    root: "/feed",
    matches: (pathname) => pathname === "/feed" || pathname.startsWith("/feed/"),
  },
  {
    key: "profile",
    label: "Profile",
    root: "/me",
    matches: (pathname) =>
      pathname === "/me" ||
      pathname.startsWith("/me/") ||
      pathname.startsWith("/u/"),
  },
];

export const TAB_KEYS: readonly TabKey[] = TABS.map((tab) => tab.key);

export function tabForPath(pathname: string): TabKey | null {
  return TABS.find((tab) => tab.matches(pathname))?.key ?? null;
}

export function tabDefinition(key: TabKey): TabDefinition {
  return TABS.find((tab) => tab.key === key) as TabDefinition;
}

export function isTabPath(key: TabKey, pathname: string): boolean {
  return tabDefinition(key).matches(pathname);
}

/** The four pages where horizontal swipes switch tabs. */
export function isRootTabPath(pathname: string): boolean {
  return TABS.some((tab) => tab.root === pathname);
}
