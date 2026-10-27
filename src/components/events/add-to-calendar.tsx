"use client";

import { CalendarPlus } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui";

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
      <Button
        variant="secondary"
        onClick={() => setOpen((current) => !current)}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <CalendarPlus size={24} strokeWidth={1.75} aria-hidden="true" />
        Add to calendar
      </Button>

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
            className="absolute left-0 top-12 z-20 w-full min-w-60 rounded-card border border-line bg-surface py-1 shadow-pop"
          >
            <a
              role="menuitem"
              href={googleUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setOpen(false)}
              className="flex min-h-11 w-full items-center px-3 text-left text-sm text-text transition-colors duration-200 ease-out hover:bg-surface-2"
            >
              Google Calendar
            </a>

            <a
              role="menuitem"
              href={icsHref}
              download="event.ics"
              onClick={() => setOpen(false)}
              className="flex min-h-11 w-full items-center px-3 text-left text-sm text-text transition-colors duration-200 ease-out hover:bg-surface-2"
            >
              Apple / Outlook (.ics)
            </a>
          </div>
        </>
      )}
    </div>
  );
}
