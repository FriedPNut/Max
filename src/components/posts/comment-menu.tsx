"use client";

import { Ellipsis } from "lucide-react";
import { useEffect, useState } from "react";
import { Button, Card } from "@/components/ui";

export function CommentMenu({ onDeleteRequested }: { onDeleteRequested: () => void }) {
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
    <div className="relative shrink-0">
      <button
        type="button"
        onClick={() => setMenuOpen((open) => !open)}
        aria-label="Comment options"
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        className="inline-flex h-11 w-11 items-center justify-center rounded-lg text-muted transition-colors duration-200 ease-out hover:text-text"
      >
        <Ellipsis size={24} strokeWidth={1.75} aria-hidden="true" />
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

          <Card
            role="menu"
            className="absolute right-0 top-11 z-20 w-40 py-1"
          >
            <Button
              role="menuitem"
              variant="destructive"
              onClick={() => {
                setMenuOpen(false);
                onDeleteRequested();
              }}
              className="min-h-11 w-full justify-start rounded-none px-3 text-sm hover:bg-surface-2"
            >
              Delete comment
            </Button>
          </Card>
        </>
      )}
    </div>
  );
}
