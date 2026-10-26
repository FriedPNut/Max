"use client";

import Link from "next/link";
import { useState } from "react";
import { Plus } from "lucide-react";
import { CreateListSheet } from "@/components/lists/create-list-sheet";
import { Chip } from "@/components/ui";
import {
  LIST_KIND_LABELS,
  type ListKind,
} from "@/lib/lists";

export type ListRow = {
  id: string;
  title: string;
  kind: ListKind;
  openCount: number;
  creatorName: string;
};

const FILTERS: { value: "all" | ListKind; label: string }[] = [
  { value: "all", label: "All" },
  { value: "food", label: "Food" },
  { value: "movies", label: "Movies" },
  { value: "places", label: "Places" },
  { value: "general", label: "General" },
];

export function ListsView({
  rows,
}: {
  rows: ListRow[];
  kinds: ListKind[];
}) {
  const [filter, setFilter] = useState<"all" | ListKind>("all");
  const [sheetOpen, setSheetOpen] = useState(false);
  const visible = rows.filter((row) => filter === "all" || row.kind === filter);

  return (
    <div className="space-y-6">
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4" role="group" aria-label="Filter lists" data-no-swipe>
        {FILTERS.map((option) => (
          <Chip
            key={option.value}
            selected={filter === option.value}
            onClick={() => setFilter(option.value)}
            className="min-h-11 px-4"
          >
            {option.label}
          </Chip>
        ))}
      </div>

      {visible.length === 0 ? (
        <p className="text-sm text-muted">No lists yet.</p>
      ) : (
        <ul className="border-t border-line">
          {visible.map((row) => (
            <li key={row.id} className="border-b border-line">
              <Link
                href={`/lists/${row.id}`}
                className="press-row -mx-4 flex min-h-14 items-center justify-between gap-3 px-4 py-3 transition-colors duration-200 ease-out hover:bg-surface-2"
              >
                <div className="min-w-0">
                  <p className="truncate text-base font-semibold text-text">{row.title}</p>
                  <p className="text-sm text-muted">
                    {LIST_KIND_LABELS[row.kind]} · by {row.creatorName}
                  </p>
                </div>
                <span className="shrink-0 text-sm text-muted">{row.openCount} open</span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <button
        type="button"
        onClick={() => setSheetOpen(true)}
        aria-label="New list"
        className="fixed z-40 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-on-primary transition-[background-color,opacity,scale] duration-100 ease-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        style={{
          bottom: "calc(72px + 16px + env(safe-area-inset-bottom, 0px))",
          right: "calc(16px + env(safe-area-inset-right, 0px))",
        }}
      >
        <Plus size={24} strokeWidth={1.75} aria-hidden="true" />
      </button>

      {sheetOpen && <CreateListSheet onClose={() => setSheetOpen(false)} />}
    </div>
  );
}
