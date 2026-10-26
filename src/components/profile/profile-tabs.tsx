"use client";

import { CalendarDays, Grid3x3 } from "lucide-react";
import { useState } from "react";

const TABS = [
  { id: "posts", label: "Posts", Icon: Grid3x3 },
  { id: "events", label: "Events", Icon: CalendarDays },
] as const;

type Tab = (typeof TABS)[number]["id"];

export function ProfileTabs({
  postsContent,
  eventsContent,
  defaultTab = "posts",
}: {
  postsContent: React.ReactNode;
  eventsContent: React.ReactNode;
  defaultTab?: Tab;
}) {
  const [tab, setTab] = useState<Tab>(defaultTab);
  const activeIndex = TABS.findIndex((item) => item.id === tab);

  return (
    <div>
      <div
        role="tablist"
        aria-label="Profile sections"
        className="relative grid grid-cols-2 border-b border-line"
      >
        {TABS.map((item) => {
          const isActive = tab === item.id;
          const Icon = item.Icon;

          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-label={item.label}
              onClick={() => setTab(item.id)}
              className={`flex min-h-12 items-center justify-center transition-colors duration-200 ease-out ${
                isActive ? "text-text" : "text-muted"
              }`}
            >
              <Icon
                size={24}
                strokeWidth={isActive ? 2 : 1.75}
                aria-hidden="true"
              />
            </button>
          );
        })}

        <span
          aria-hidden="true"
          className="absolute bottom-0 left-0 h-px w-1/2 bg-text transition-transform duration-200 ease-out"
          style={{
            transform: `translate3d(${activeIndex * 100}%, 0, 0)`,
          }}
        />
      </div>

      {tab === "posts" ? (
        postsContent
      ) : (
        <div className="pt-4">{eventsContent}</div>
      )}
    </div>
  );
}
