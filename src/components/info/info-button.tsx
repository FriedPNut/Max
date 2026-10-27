"use client";

import dynamic from "next/dynamic";
import { Info } from "lucide-react";
import { useState } from "react";
import { createPortal } from "react-dom";

// Nothing about the hub ships with the Events page: the chunk and its server
// actions arrive on the first tap.
const InfoSheet = dynamic(
  () => import("@/components/info/info-sheet").then((m) => m.InfoSheet),
  { ssr: false }
);

export function InfoButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Info"
        aria-haspopup="dialog"
        className="inline-flex h-11 w-11 items-center justify-center rounded-full text-text transition-colors duration-200 ease-out hover:bg-surface-2 active:opacity-60"
      >
        <Info size={24} strokeWidth={1.75} aria-hidden="true" />
      </button>

      {/* The header is glass, which would contain a fixed sheet; the body does not. */}
      {open
        ? createPortal(
            <InfoSheet onClose={() => setOpen(false)} />,
            document.body
          )
        : null}
    </>
  );
}
