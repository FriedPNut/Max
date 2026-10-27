"use client";

import { useState } from "react";
import { SegmentedControl, Sheet } from "@/components/ui";
import {
  BirthdaysSection,
  ListsSection,
  TripsSection,
} from "@/components/info/info-sections";
import type { InfoTab } from "@/components/info/info-cache";
import { useShellProfile } from "@/lib/shell-state";

const TAB_KEY = "max:info-tab:v1";

const TABS: { value: InfoTab; label: string }[] = [
  { value: "lists", label: "Lists" },
  { value: "trips", label: "Trips" },
  { value: "birthdays", label: "Birthdays" },
];

function readTab(): InfoTab {
  try {
    const stored = localStorage.getItem(TAB_KEY);

    return stored === "trips" || stored === "birthdays" ? stored : "lists";
  } catch {
    return "lists";
  }
}

function rememberTab(tab: InfoTab) {
  try {
    localStorage.setItem(TAB_KEY, tab);
  } catch {
    // Private mode: the tab just won't be remembered.
  }
}

/**
 * The Info hub: one tall sheet, three segments. A segment's data is fetched the
 * first time it is opened, then kept for the session, so opening the sheet
 * never adds work to the Events page.
 */
export function InfoSheet({ onClose }: { onClose: () => void }) {
  const profile = useShellProfile();
  const [tab, setTab] = useState<InfoTab>(readTab);
  const userId = profile?.userId ?? "";

  function selectTab(next: InfoTab) {
    setTab(next);
    rememberTab(next);
  }

  return (
    <Sheet label="Info" tall onClose={onClose}>
      <div className="pb-6">
        <div className="sticky -top-2 z-10 -mx-4 -mt-2 bg-surface px-4 pb-3 pt-2">
          <h2 className="mb-3 text-[20px] font-bold leading-tight text-text">
            Info
          </h2>

          <SegmentedControl
            label="Info sections"
            value={tab}
            onChange={selectTab}
            options={TABS}
          />
        </div>

        <div className="pt-4">
          {tab === "lists" ? <ListsSection /> : null}
          {tab === "trips" ? <TripsSection userId={userId} /> : null}
          {tab === "birthdays" ? <BirthdaysSection /> : null}
        </div>
      </div>
    </Sheet>
  );
}
