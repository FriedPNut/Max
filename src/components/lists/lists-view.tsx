"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { Plus } from "lucide-react";
import { FastLink } from "@/components/ui/fast-link";
import { Chip, Toast } from "@/components/ui";

const CreateListSheet = dynamic(
  () =>
    import("@/components/lists/create-list-sheet").then(
      (m) => m.CreateListSheet
    ),
  { ssr: false }
);
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
  creatorName = "You",
}: {
  rows: ListRow[];
  kinds: ListKind[];
  creatorName?: string;
}) {
  const [filter, setFilter] = useState<"all" | ListKind>("all");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [created, setCreated] = useState<ListRow[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const allRows = [...created, ...rows];
  const visible = allRows.filter(
    (row) => filter === "all" || row.kind === filter
  );

  function handleCreated(row: { id: string; title: string; kind: ListKind }) {
    setCreated((current) => [
      { ...row, openCount: 0, creatorName },
      ...current,
    ]);
  }

  function handleFailed(id: string, message: string) {
    setCreated((current) => current.filter((row) => row.id !== id));
    setToast(message);
  }

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
              <FastLink
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
              </FastLink>
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

      {sheetOpen && (
        <CreateListSheet
          onClose={() => setSheetOpen(false)}
          onCreated={handleCreated}
          onFailed={handleFailed}
        />
      )}

      <Toast message={toast} onDone={() => setToast(null)} />
    </div>
  );
}
