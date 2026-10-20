"use client";

import { X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { PostComposer } from "@/components/posts/post-composer";

type EventOption = { id: string; title: string; startsAt: string };

export function NewPostButton({ userId, eventId = "", events = [], buttonLabel = "New post" }: { userId: string; eventId?: string; events?: EventOption[]; buttonLabel?: string }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    closeRef.current?.focus();

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="shrink-0 min-h-11 px-4 py-3 rounded-lg bg-text text-white font-sans font-medium text-sm transition-opacity duration-150 ease-out hover:opacity-90 cursor-pointer"
      >
        {buttonLabel}
      </button>

      {open && (
        <>
          <div
            aria-hidden="true"
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-50 bg-text/30"
          />

          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="new-post-sheet-title"
            className="fixed inset-x-0 bottom-0 z-50 mx-auto max-h-[92dvh] w-full max-w-[560px] overflow-y-auto rounded-t-lg border-t border-line bg-background px-4 pb-6 pt-4"
          >
            <div className="mb-5 flex items-center justify-between gap-3">
              <h2
                id="new-post-sheet-title"
                className="text-lg font-semibold text-text"
              >
                New post
              </h2>

              <button
                ref={closeRef}
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="inline-flex h-11 w-11 -mr-2 items-center justify-center rounded-lg text-text transition-colors duration-150 ease-out hover:bg-surface cursor-pointer"
              >
                <X size={20} strokeWidth={1.5} aria-hidden="true" />
              </button>
            </div>

            <PostComposer
              userId={userId}
              eventId={eventId}
              events={events}
              onClose={() => setOpen(false)}
              onPosted={() => {
                setOpen(false);
                router.refresh();
              }}
            />
          </div>
        </>
      )}
    </>
  );
}
