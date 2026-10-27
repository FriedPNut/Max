"use client";

import Link from "next/link";
import {
  ChatFilledIcon,
  ChatIcon,
  EventsFilledIcon,
  EventsIcon,
  PostFilledIcon,
  PostIcon,
} from "@/components/icons";
import { Avatar, Badge } from "@/components/ui";
import { TAB_KEYS, TABS, type TabKey } from "@/lib/tabs";

type BadgeValue = number | boolean | null | undefined;

/** Docked bottom bar for Android and other platforms (DESIGN.md §12). */
export function DockBar({
  activeTab,
  hidden,
  hrefs,
  profile,
  badges,
  onSelect,
}: {
  activeTab: TabKey | null;
  hidden: boolean;
  hrefs: Record<TabKey, string>;
  profile: { src: string | null; initial: string; name: string };
  badges?: Partial<Record<TabKey, BadgeValue>>;
  onSelect: (tab: TabKey) => void;
}) {
  const activeIndex = activeTab ? TAB_KEYS.indexOf(activeTab) : -1;

  return (
    <nav
      aria-label="Primary navigation"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-background text-text transition-transform duration-200 ease-[var(--ease-out)]"
      style={{
        height: "calc(56px + env(safe-area-inset-bottom, 0px))",
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
        transform: hidden ? "translate3d(0, 100%, 0)" : "translate3d(0, 0, 0)",
        visibility: hidden ? "hidden" : "visible",
      }}
      aria-hidden={hidden ? true : undefined}
      inert={hidden ? true : undefined}
    >
      <ul className="relative mx-auto grid h-14 max-w-[560px] grid-cols-4">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute left-0 top-0 h-full w-1/4 transition-transform duration-200 ease-[var(--ease-spring)]"
          style={{
            transform: `translate3d(${Math.max(activeIndex, 0) * 100}%, 0, 0)`,
            opacity: activeIndex >= 0 ? 1 : 0,
          }}
        >
          <span className="absolute left-1/2 top-[10px] h-9 w-16 -translate-x-1/2 rounded-[18px] bg-surface-2" />
        </span>

        {TABS.map((tab) => {
          const isActive = tab.key === activeTab;
          const badge = badges?.[tab.key];
          const showCount = typeof badge === "number" && badge > 0;
          const showDot = badge === true;

          return (
            <li key={tab.key} className="flex">
              <Link
                href={hrefs[tab.key]}
                aria-label={tab.label}
                aria-current={isActive ? "page" : undefined}
                onClick={(event) => {
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

                  event.preventDefault();
                  onSelect(tab.key);
                }}
                className={`relative flex h-14 min-w-11 flex-1 items-center justify-center transition-colors duration-200 ease-out ${
                  isActive ? "text-text" : "text-muted"
                }`}
              >
                <span className="relative inline-flex items-center justify-center">
                  {tab.key === "profile" ? (
                    <Avatar
                      src={profile.src}
                      initial={profile.initial}
                      name={profile.name}
                      size={24}
                      className={isActive ? "ring-2 ring-text" : ""}
                    />
                  ) : tab.key === "events" ? (
                    isActive ? <EventsFilledIcon /> : <EventsIcon />
                  ) : tab.key === "chat" ? (
                    isActive ? <ChatFilledIcon /> : <ChatIcon />
                  ) : isActive ? (
                    <PostFilledIcon />
                  ) : (
                    <PostIcon />
                  )}

                  {showCount ? (
                    <Badge
                      count={badge}
                      className="absolute -top-1.5 -right-2 h-4 min-h-4 min-w-4 text-[10px]"
                    />
                  ) : null}
                  {showDot ? (
                    <Badge
                      dot
                      label={`${tab.label}, unread`}
                      className="absolute -top-0.5 -right-1 h-2 w-2"
                    />
                  ) : null}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
