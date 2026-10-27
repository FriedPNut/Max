"use client";

import {
  createContext,
  useContext,
  useState,
  type ReactNode,
} from "react";
import { SegmentedControl } from "@/components/ui";

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
          style={{ top: "calc(env(safe-area-inset-top, 0px) + 57px)" }}
        >
          <div data-no-swipe>
            <SegmentedControl
              label="Event sections"
              options={tabs.map((tab) => ({ value: tab.id, label: tab.label }))}
              value={activeId}
              onChange={setActiveId}
            />
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
