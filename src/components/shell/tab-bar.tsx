"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type MouseEvent } from "react";
import {
  ChatFilledIcon,
  ChatIcon,
  EventsFilledIcon,
  EventsIcon,
  PostFilledIcon,
  PostIcon,
} from "@/components/icons";
import { Avatar } from "@/components/ui";
import { useShellProfile } from "@/lib/shell-state";
import {
  getTabScroll,
  rememberTabScroll,
  setPendingNavigation,
} from "@/lib/tab-memory";
import { TAB_KEYS, TABS, tabForPath, tabRoot, type TabKey } from "@/lib/tabs";

const PENDING_MS = 1500;

/**
 * The only bottom navigation in the app. It is mounted once, by the root shell,
 * and never inside a page, a loading screen or a skeleton.
 *
 * - The active tab is a pure function of the pathname; there is no remembered
 *   origin tab, so the URL and the highlight can never disagree.
 * - A press moves the highlight and the pill immediately through `pendingTab`,
 *   which clears when the URL changes or after 1.5s, whichever comes first.
 * - The floating island (iOS) and the docked bar (Android and other) are the
 *   same markup; globals.css picks the shape from html[data-platform].
 */
export function TabBar({
  hidden,
  scrolled = false,
}: {
  /** Structurally hidden: a full-screen screen or a sheet is in front. */
  hidden: boolean;
  /** Scrolling down; only the iOS island steps aside for this. */
  scrolled?: boolean;
}) {
  const pathname = usePathname();
  const profile = useShellProfile();
  const activeTab = tabForPath(pathname);
  const [pendingTab, setPendingTab] = useState<TabKey | null>(null);

  // Landed: the URL is the truth again.
  useEffect(() => {
    setPendingTab(null);
  }, [pathname]);

  // An abandoned tap must not leave the highlight on the wrong tab.
  useEffect(() => {
    if (!pendingTab) {
      return;
    }

    const timer = window.setTimeout(() => setPendingTab(null), PENDING_MS);
    return () => window.clearTimeout(timer);
  }, [pendingTab]);

  const shownTab = pendingTab ?? activeTab;
  const activeIndex = shownTab ? TAB_KEYS.indexOf(shownTab) : -1;

  function handleClick(event: MouseEvent<HTMLAnchorElement>, key: TabKey) {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return;
    }

    // The live URL decides what the tap means, never the pending state.
    const livePath = window.location.pathname;
    const root = tabRoot(key);

    // Already at this tab's root: the tap means "back to the top".
    if (livePath === root) {
      event.preventDefault();
      document
        .querySelector<HTMLElement>("[data-shell-scroll]")
        ?.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    // Elsewhere: a plain Link navigation to the root. Remember where the tab
    // being left was, so a swipe back to it restores the position.
    const owner = tabForPath(livePath);
    const scroller = document.querySelector<HTMLElement>("[data-shell-scroll]");

    if (owner && livePath === tabRoot(owner) && scroller) {
      rememberTabScroll(owner, scroller.scrollTop);
    }

    setPendingNavigation(root, getTabScroll(key), 0);
  }

  return (
    <nav
      aria-label="Primary navigation"
      className="tabbar"
      data-hidden={hidden ? "true" : undefined}
      data-scrolled={scrolled ? "true" : undefined}
      aria-hidden={hidden ? true : undefined}
      inert={hidden ? true : undefined}
    >
      <div className="tabbar-inner">
        <span
          aria-hidden="true"
          className="tabbar-pill"
          style={{
            transform: `translate3d(${Math.max(activeIndex, 0) * 100}%, 0, 0)`,
            opacity: activeIndex >= 0 ? 1 : 0,
          }}
        >
          <span className="tabbar-pill-inner" />
        </span>

        <ul className="tabbar-list">
          {TABS.map((tab) => {
            const isActive = tab.key === shownTab;

            return (
              <li key={tab.key}>
                <Link
                  href={tab.root}
                  aria-label={tab.label}
                  aria-current={isActive ? "page" : undefined}
                  data-tab={tab.key}
                  data-active={isActive ? "true" : undefined}
                  onPointerDown={() => setPendingTab(tab.key)}
                  onClick={(event) => handleClick(event, tab.key)}
                  className="tabbar-link"
                >
                  <span className="tabbar-icon">
                    {tab.key === "profile" ? (
                      <span className="tabbar-avatar">
                        {profile ? (
                          <Avatar
                            src={profile.avatarUrl}
                            initial={profile.initial}
                            name={profile.name}
                            size={24}
                          />
                        ) : (
                          <span
                            aria-hidden="true"
                            className="block h-6 w-6 rounded-full bg-surface-2"
                          />
                        )}
                      </span>
                    ) : tab.key === "events" ? (
                      isActive ? <EventsFilledIcon /> : <EventsIcon />
                    ) : tab.key === "chat" ? (
                      isActive ? <ChatFilledIcon /> : <ChatIcon />
                    ) : isActive ? (
                      <PostFilledIcon />
                    ) : (
                      <PostIcon />
                    )}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}
