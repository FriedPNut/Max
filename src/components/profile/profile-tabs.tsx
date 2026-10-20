"use client";

import { useState } from "react";

const TABS = [
  { id: "posts", label: "Posts" },
  { id: "events", label: "Events" },
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

  return (
    <div>
      <div role="tablist" aria-label="Profile sections" className="grid grid-cols-2 border-b border-line">
        {TABS.map((item) => {
          const isActive = tab === item.id;

          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setTab(item.id)}
              className={`relative min-h-11 text-sm transition-colors duration-150 ease-out cursor-pointer ${
                isActive
                  ? "text-text font-medium"
                  : "text-muted hover:text-text"
              }`}
            >
              {item.label}
              {isActive && (
                <span
                  aria-hidden="true"
                  className="absolute inset-x-0 bottom-0 h-[2px] bg-accent"
                />
              )}
            </button>
          );
        })}
      </div>

      <div className="pt-4">
        {tab === "posts" ? postsContent : eventsContent}
      </div>
    </div>
  );
}
