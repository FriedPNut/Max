"use client";

import Link from "next/link";
import { useState } from "react";
import { GridIcon, ImageIcon, PlusIcon } from "@/components/icons";
import { Sheet } from "@/components/ui";

/** The "+" on the Post tab opens this sheet: Post or Poll. */
export function CreatePostSheetButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Create"
        className="inline-flex h-11 w-11 items-center justify-center rounded-full text-text transition-colors duration-200 hover:bg-surface-2"
      >
        <PlusIcon size={24} strokeWidth={1.75} aria-hidden="true" />
      </button>

      {open && (
        <Sheet label="Create" onClose={() => setOpen(false)}>
          <ul className="space-y-1 pb-2">
            <li>
              <Link
                href="/feed/new"
                className="flex items-center gap-3 rounded-[14px] px-3 py-3 text-base font-semibold text-text hover:bg-surface-2"
              >
                <ImageIcon size={24} strokeWidth={1.75} aria-hidden="true" />
                Post
              </Link>
            </li>
            <li>
              <span
                aria-disabled="true"
                className="flex items-center gap-3 rounded-[14px] px-3 py-3 text-base font-semibold text-muted"
              >
                <GridIcon size={24} strokeWidth={1.75} aria-hidden="true" />
                Poll
                <span className="ml-auto text-xs font-normal">Coming soon</span>
              </span>
            </li>
          </ul>
        </Sheet>
      )}
    </>
  );
}
