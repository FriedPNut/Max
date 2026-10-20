"use client";

import { Ellipsis } from "lucide-react";
import { useEffect, useState } from "react";

export function DeletePostMenu({
  onDeleteRequested,
}: {
  onDeleteRequested: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!menuOpen) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMenuOpen(false);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [menuOpen]);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setMenuOpen((open) => !open)}
        aria-label="Post options"
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        className="inline-flex h-11 w-11 items-center justify-center rounded-lg text-muted transition-colors duration-150 ease-out hover:text-text cursor-pointer"
      >
        <Ellipsis size={20} strokeWidth={1.5} aria-hidden="true" />
      </button>

      {menuOpen && (
        <>
          <button
            type="button"
            aria-label="Close menu"
            tabIndex={-1}
            onClick={() => setMenuOpen(false)}
            className="fixed inset-0 z-10 cursor-default bg-transparent"
          />

          <div
            role="menu"
            className="absolute right-0 top-11 z-20 w-40 rounded-lg border border-line bg-surface py-1"
          >
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setMenuOpen(false);
                onDeleteRequested();
              }}
              className="flex min-h-11 w-full items-center px-3 text-left text-sm text-text transition-colors duration-150 ease-out hover:bg-background cursor-pointer"
            >
              Delete post
            </button>
          </div>
        </>
      )}
    </div>
  );
}
