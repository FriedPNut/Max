"use client";

import Link from "next/link";
import { Ellipsis } from "lucide-react";
import { useEffect, useState } from "react";
import { LogoutButton } from "@/components/notifications/logout-button";

export function ProfileMenu() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-label="Profile options"
        aria-haspopup="menu"
        aria-expanded={open}
        className="inline-flex h-11 w-11 items-center justify-center rounded-lg text-text transition-colors duration-150 ease-out hover:bg-surface cursor-pointer"
      >
        <Ellipsis size={24} strokeWidth={1.5} aria-hidden="true" />
      </button>

      {open && (
        <>
          <button
            type="button"
            aria-label="Close menu"
            tabIndex={-1}
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-10 cursor-default bg-transparent"
          />

          <div
            role="menu"
            className="absolute right-0 top-11 z-20 w-40 rounded-lg border border-line bg-surface py-1"
          >
            <Link
              href="/settings/notifications"
              role="menuitem"
              onClick={() => setOpen(false)}
              className="flex min-h-11 w-full items-center px-3 text-sm text-text transition-colors duration-150 ease-out hover:bg-background"
            >
              Notifications
            </Link>
            <LogoutButton />
          </div>
        </>
      )}
    </div>
  );
}
