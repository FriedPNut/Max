"use client";

import { Plus } from "lucide-react";

export function AddIdeaButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Add idea"
      className="fixed z-40 flex h-14 w-14 items-center justify-center rounded-full bg-text text-white transition-colors duration-150 ease-out hover:bg-text/90 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-text"
      style={{
        bottom: "calc(56px + 16px + env(safe-area-inset-bottom, 0px))",
        right: "calc(16px + env(safe-area-inset-right, 0px))",
      }}
    >
      <Plus size={24} strokeWidth={1.5} aria-hidden="true" />
    </button>
  );
}
