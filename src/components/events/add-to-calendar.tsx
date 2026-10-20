"use client";

import { CalendarPlus } from "lucide-react";
import { useEffect, useState } from "react";

export function AddToCalendar({
  googleUrl,
  icsHref,
}: {
  googleUrl: string;
  icsHref: string;
}) {
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
        aria-haspopup="menu"
        aria-expanded={open}
        className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-line bg-transparent px-4 py-3 text-sm font-medium text-text transition-colors duration-150 ease-out hover:bg-surface cursor-pointer"
      >
        <CalendarPlus size={20} strokeWidth={1.5} aria-hidden="true" />
        Add to calendar
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
            className="absolute left-0 top-12 z-20 w-full min-w-60 rounded-lg border border-line bg-surface py-1"
          >
            <a
              role="menuitem"
              href={googleUrl}
              target="_blank"
              rel="noreferrer"
              onClick={() => setOpen(false)}
              className="flex min-h-11 w-full items-center px-3 text-left text-sm text-text transition-colors duration-150 ease-out hover:bg-background"
            >
              Google Calendar
            </a>

            <a
              role="menuitem"
              href={icsHref}
              download="event.ics"
              onClick={() => setOpen(false)}
              className="flex min-h-11 w-full items-center px-3 text-left text-sm text-text transition-colors duration-150 ease-out hover:bg-background"
            >
              Apple / Outlook (.ics)
            </a>
          </div>
        </>
      )}
    </div>
  );
}
