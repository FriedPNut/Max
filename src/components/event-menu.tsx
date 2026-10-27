"use client";

import Link from "next/link";
import { Ellipsis, X } from "lucide-react";
import { useActionState, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  deleteEventAction,
  type DeleteEventState,
} from "@/app/actions/events";
import { SERIES_SCOPE_OPTIONS } from "@/lib/events";
import { lockPageScroll } from "@/lib/scroll-lock";
import { Button, buttonStyles, Card } from "@/components/ui";

export function EventMenu({
  eventId,
  hasSeries = false,
  fromIdea = false,
}: {
  eventId: string;
  hasSeries?: boolean;
  /** The event came from an idea, which is deleted along with it. */
  fromIdea?: boolean;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [state, formAction, pending] = useActionState(
    deleteEventAction,
    {} as DeleteEventState
  );
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!confirming) {
      return;
    }

    cancelRef.current?.focus();
    const unlock = lockPageScroll();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !pending) {
        setConfirming(false);
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      unlock();
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [confirming, pending]);

  function openDelete() {
    setMenuOpen(false);
    setConfirming(true);
  }

  function closeDialog() {
    if (!pending) {
      setConfirming(false);
    }
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setMenuOpen((current) => !current)}
        aria-label="Event options"
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        className="inline-flex h-11 w-11 items-center justify-center rounded-full text-text transition-colors duration-200 ease-out hover:bg-surface-2"
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
            className="absolute right-0 top-11 z-20 w-44 py-1 shadow-pop"
          >
            <Link
              href={`/events/${eventId}/edit`}
              role="menuitem"
              onClick={() => setMenuOpen(false)}
              className="flex min-h-11 w-full items-center px-3 text-left text-sm text-text transition-colors duration-200 ease-out hover:bg-surface-2"
            >
              Edit
            </Link>

            <button
              type="button"
              role="menuitem"
              onClick={openDelete}
              className="flex min-h-11 w-full items-center px-3 text-left text-sm text-danger transition-colors duration-200 ease-out hover:bg-surface-2"
            >
              Delete
            </button>
          </Card>
        </>
      )}

      {confirming &&
        createPortal(
          <>
            <div
              aria-hidden="true"
              onClick={closeDialog}
              className="fixed inset-0 z-50 bg-scrim/40"
            />

            <Card
              role="dialog"
              aria-modal="true"
              aria-labelledby="delete-event-title"
              className="fixed left-1/2 top-1/2 z-50 max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 overflow-y-auto p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <h2
                  id="delete-event-title"
                  className="text-lg font-semibold text-text"
                >
                  Delete event
                </h2>

                <button
                  type="button"
                  onClick={closeDialog}
                  disabled={pending}
                  aria-label="Close"
                  className="inline-flex h-11 w-11 -mr-2 -mt-2 shrink-0 items-center justify-center rounded-full text-text transition-colors duration-200 ease-out hover:bg-surface-2 disabled:pointer-events-none disabled:opacity-40"
                >
                  <X size={24} strokeWidth={1.75} aria-hidden="true" />
                </button>
              </div>

              <p className="mt-2 text-sm text-text">
                {hasSeries
                  ? "Choose which events to delete. This can't be undone."
                  : fromIdea
                  ? "Delete this event? This also deletes the idea it came from."
                  : "Delete this event? This can't be undone."}
              </p>

              {hasSeries && fromIdea && (
                <p className="mt-2 text-sm text-text">
                  The idea it came from is deleted too.
                </p>
              )}

              {state.error && (
                <p role="alert" className="mt-3 text-sm text-text">
                  {state.error}
                </p>
              )}

              <form action={formAction} className="mt-5 space-y-4">
                <input type="hidden" name="event_id" value={eventId} />

                {hasSeries && (
                  <fieldset className="space-y-2">
                    <legend className="text-sm text-muted">Which events?</legend>

                    <div className="space-y-1">
                      {SERIES_SCOPE_OPTIONS.map((option) => (
                        <label
                          key={option.value}
                          className="flex min-h-11 cursor-pointer items-center gap-2 text-sm text-text"
                        >
                          <input
                            type="radio"
                            name="scope"
                            value={option.value}
                            defaultChecked={option.value === "only"}
                            className="h-4 w-4 accent-primary"
                          />
                          {option.label}
                        </label>
                      ))}
                    </div>
                  </fieldset>
                )}

                <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                  <button
                    ref={cancelRef}
                    type="button"
                    onClick={closeDialog}
                    disabled={pending}
                    className={buttonStyles({ variant: "secondary" })}
                  >
                    Cancel
                  </button>

                  <Button type="submit" variant="destructive" disabled={pending}>
                    {pending ? "Deleting..." : "Delete"}
                  </Button>
                </div>
              </form>
            </Card>
          </>,
          document.body
        )}
    </div>
  );
}
