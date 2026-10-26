"use client";

import Link from "next/link";
import { useEffect, useLayoutEffect, useState } from "react";
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

// These survive the page swap so the tap pulse still plays on the new page
// and the highlight slides from the tab that was active before.
let lastTap: { tab: TabKey; at: number } | null = null;
let lastActiveTab: TabKey | null = null;

export function IslandBar({
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
  const [pulse, setPulse] = useState<{ key: TabKey; n: number } | null>(() => {
    if (!lastTap || Date.now() - lastTap.at > 400) {
      return null;
    }

    return { key: lastTap.tab, n: lastTap.at };
  });
  const activeIndex = activeTab ? TAB_KEYS.indexOf(activeTab) : -1;
  const [pillIndex, setPillIndex] = useState(activeIndex);

  // On a fresh page the highlight starts where the previous page left it, then
  // slides across once the new page has painted.
  useLayoutEffect(() => {
    const previous = lastActiveTab ? TAB_KEYS.indexOf(lastActiveTab) : -1;

    if (activeIndex >= 0 && previous >= 0 && previous !== activeIndex) {
      setPillIndex(previous);
    }

    if (activeTab) {
      lastActiveTab = activeTab;
    }
    // Mount only: later tab changes are handled by the effect below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (activeTab) {
      lastActiveTab = activeTab;
    }
  }, [activeTab]);

  useEffect(() => {
    if (pillIndex === activeIndex) {
      return;
    }

    let second = 0;
    const first = requestAnimationFrame(() => {
      second = requestAnimationFrame(() => setPillIndex(activeIndex));
    });

    return () => {
      cancelAnimationFrame(first);

      if (second) {
        cancelAnimationFrame(second);
      }
    };
  }, [activeIndex, pillIndex]);

  function handleSelect(key: TabKey) {
    lastTap = { tab: key, at: Date.now() };
    setPulse({ key, n: lastTap.at });
    onSelect(key);
  }

  return (
    <nav
      aria-label="Primary navigation"
      className={`glass fixed left-1/2 z-40 rounded-full border border-line text-text shadow-pop transition-[transform,opacity] duration-[250ms] ease-[var(--ease-out)] ${
        hidden ? "pointer-events-none" : ""
      }`}
      style={{
        bottom: "calc(env(safe-area-inset-bottom, 0px) + 12px)",
        width: "min(calc(100% - 32px), 420px)",
        height: 60,
        transform: hidden
          ? "translate(-50%, calc(100% + 24px))"
          : "translate(-50%, 0)",
        opacity: hidden ? 0 : 1,
        willChange: "transform, opacity",
      }}
      aria-hidden={hidden ? true : undefined}
      inert={hidden ? true : undefined}
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute top-[8px] left-[10px] h-11 w-[calc(25%_-_20px)] rounded-full bg-surface-2/60 transition-[transform,opacity] duration-200 ease-[var(--ease-spring)]"
        style={{
          transform: `translateX(calc(${Math.max(pillIndex, 0)} * (100% + 20px)))`,
          opacity: activeIndex >= 0 ? 1 : 0,
        }}
      />

      <ul className="relative grid h-full grid-cols-4">
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
                  handleSelect(tab.key);
                }}
                className={`relative flex min-h-11 min-w-11 flex-1 items-center justify-center transition-colors duration-200 ease-out ${
                  isActive ? "text-text" : "text-muted"
                }`}
              >
                <span
                  key={`${tab.key}-${pulse?.key === tab.key ? pulse.n : 0}`}
                  className="relative inline-flex items-center justify-center"
                  style={
                    pulse?.key === tab.key
                      ? { animation: "tab-tap 220ms var(--ease-spring)" }
                      : undefined
                  }
                >
                  {tab.key === "profile" ? (
                    <span
                      className={`flex h-7 w-7 items-center justify-center rounded-full ${
                        isActive ? "ring-2 ring-text" : ""
                      }`}
                    >
                      <Avatar
                        src={profile.src}
                        initial={profile.initial}
                        name={profile.name}
                        size={24}
                      />
                    </span>
                  ) : tab.key === "events" ? (
                    isActive ? (
                      <EventsFilledIcon />
                    ) : (
                      <EventsIcon />
                    )
                  ) : tab.key === "chat" ? (
                    isActive ? (
                      <ChatFilledIcon />
                    ) : (
                      <ChatIcon />
                    )
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
