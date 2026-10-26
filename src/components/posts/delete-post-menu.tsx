"use client";

import { Ellipsis } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Button, Card } from "@/components/ui";
import { copyToClipboard } from "@/lib/clipboard";

export function DeletePostMenu({
  postId,
  onDeleteRequested,
}: {
  postId: string;
  onDeleteRequested?: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [copied, setCopied] = useState<"idle" | "copied" | "error">("idle");
  const copyTimer = useRef<number | null>(null);

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

  useEffect(() => {
    return () => {
      if (copyTimer.current !== null) {
        window.clearTimeout(copyTimer.current);
      }
    };
  }, []);

  async function handleCopy() {
    const copiedOk = await copyToClipboard(
      `${window.location.origin}/feed/${postId}`
    );

    setCopied(copiedOk ? "copied" : "error");

    if (copyTimer.current !== null) {
      window.clearTimeout(copyTimer.current);
    }

    copyTimer.current = window.setTimeout(() => setCopied("idle"), 2_000);
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setMenuOpen((open) => !open)}
        aria-label="Post options"
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        className="inline-flex h-11 w-11 -mr-2 items-center justify-center text-text transition-opacity duration-200 ease-out hover:opacity-70"
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

          <Card role="menu" className="absolute right-0 top-11 z-20 w-44 py-1">
            <Button
              role="menuitem"
              variant="text"
              onClick={() => void handleCopy()}
              className="min-h-11 w-full justify-start rounded-none px-3 text-sm font-normal text-text hover:bg-surface-2"
            >
              {copied === "copied"
                ? "Link copied"
                : copied === "error"
                ? "Couldn't copy"
                : "Copy link"}
            </Button>

            <Link
              role="menuitem"
              href={`/feed/${postId}`}
              className="flex min-h-11 w-full items-center rounded-none px-3 text-sm text-text transition-colors duration-200 ease-out hover:bg-surface-2"
            >
              View post
            </Link>

            {onDeleteRequested && (
              <Button
                role="menuitem"
                variant="destructive"
                onClick={() => {
                  setMenuOpen(false);
                  onDeleteRequested();
                }}
                className="min-h-11 w-full justify-start rounded-none px-3 text-sm hover:bg-surface-2"
              >
                Delete post
              </Button>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
