"use client";

import {
  createContext,
  useContext,
  useState,
  type ReactNode,
} from "react";

type EventTabsContextValue = string;

const EventTabsContext = createContext<EventTabsContextValue>("");

export function useActiveEventTab() {
  return useContext(EventTabsContext);
}

export type EventTabItem = {
  id: string;
  label: string;
  content: ReactNode;
};

export function EventTabs({ tabs }: { tabs: EventTabItem[] }) {
  const [activeId, setActiveId] = useState(tabs[0]?.id ?? "");

  return (
    <EventTabsContext.Provider value={activeId}>
      <div>
        <div className="sticky top-14 z-30 -mx-4 bg-background px-4 py-2">
          <div
            role="group"
            aria-label="Event sections"
            className="flex gap-1 overflow-x-auto rounded-lg border border-line bg-surface p-1"
          >
            {tabs.map((tab) => {
              const isActive = tab.id === activeId;

              return (
                <button
                  key={tab.id}
                  type="button"
                  aria-pressed={isActive}
                  onClick={() => setActiveId(tab.id)}
                  className={`min-h-11 min-w-[72px] shrink-0 rounded-lg px-3 text-sm transition-colors duration-150 ease-out cursor-pointer ${
                    isActive
                      ? "bg-text font-medium text-white"
                      : "text-muted hover:text-text"
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {tabs.map((tab) => (
          <div key={tab.id} hidden={tab.id !== activeId} className="pt-6">
            {tab.content}
          </div>
        ))}
      </div>
    </EventTabsContext.Provider>
  );
}
