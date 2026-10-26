"use client";

import {
  createContext,
  useContext,
  useState,
  type ReactNode,
} from "react";
import { Chip } from "@/components/ui";

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
        <div
          className="sticky z-30 -mx-4 bg-background px-4 py-2"
          style={{ top: "calc(env(safe-area-inset-top, 0px) + 49px)" }}
        >
          <div
            role="group"
            aria-label="Event sections"
            className="flex gap-1 overflow-x-auto rounded-full bg-surface-2 p-1"
            data-no-swipe
          >
            {tabs.map((tab) => (
              <Chip
                key={tab.id}
                selected={tab.id === activeId}
                onClick={() => setActiveId(tab.id)}
                className="min-h-11 min-w-[72px] px-3"
              >
                {tab.label}
              </Chip>
            ))}
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
