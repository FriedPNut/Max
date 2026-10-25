"use client";

import { X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
  createIdeaAction,
  updateIdeaAction,
} from "@/app/actions/ideas";
import type { IdeaListItem } from "@/lib/events";

const fieldClass =
  "w-full bg-surface text-text placeholder:text-muted border border-border rounded-lg px-3 py-3 text-base leading-snug focus:outline-2 focus:outline-offset-0 focus:outline-text";

const labelClass = "block text-sm text-muted mb-2";

type IdeaSheetProps = {
  mode: "create" | "edit";
  idea?: IdeaListItem;
  onClose: () => void;
  onCreated?: (idea: IdeaListItem) => void;
  onUpdated?: (patch: {
    title: string;
    description: string | null;
  }) => void;
};

export function IdeaSheet({
  mode,
  idea,
  onClose,
  onCreated,
  onUpdated,
}: IdeaSheetProps) {
  const [title, setTitle] = useState(idea?.title ?? "");
  const [description, setDescription] = useState(idea?.description ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [visible, setVisible] = useState(false);
  const closeTimer = useRef<number | null>(null);
  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setVisible(true));
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    titleRef.current?.focus();
  }, []);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  useEffect(() => {
    return () => {
      if (closeTimer.current !== null) {
        window.clearTimeout(closeTimer.current);
      }
    };
  }, []);

  function closeNow() {
    if (closeTimer.current !== null) {
      return;
    }

    setVisible(false);
    closeTimer.current = window.setTimeout(onClose, 200);
  }

  function handleClose() {
    if (!pending) {
      closeNow();
    }
  }

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !pending) {
        closeNow();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [pending]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (pending) {
      return;
    }

    const cleanTitle = title.trim();

    if (!cleanTitle) {
      setError("Add a title first.");
      return;
    }

    setError(null);
    setPending(true);

    try {
      if (mode === "create") {
        const result = await createIdeaAction(cleanTitle, description);

        if (result.error) {
          setError(result.error);
          setPending(false);
          return;
        }

        if (result.idea) {
          onCreated?.(result.idea);
        }

        setPending(false);
        closeNow();
        return;
      }

      if (!idea) {
        setError("Couldn't find that idea. Try again.");
        setPending(false);
        return;
      }

      const result = await updateIdeaAction(idea.id, cleanTitle, description);

      if (result.error) {
        setError(result.error);
        setPending(false);
        return;
      }

      onUpdated?.({
        title: result.title ?? cleanTitle,
        description: result.description ?? null,
      });
      setPending(false);
      closeNow();
    } catch {
      setError("Couldn't save that idea. Try again.");
      setPending(false);
    }
  }

  const isEditing = mode === "edit";

  return (
    <>
      <div
        aria-hidden="true"
        onClick={handleClose}
        className={`fixed inset-0 z-50 bg-scrim/30 transition-opacity duration-200 ease-out ${
          visible ? "opacity-100" : "opacity-0"
        }`}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="idea-sheet-title"
        className={`fixed inset-x-0 bottom-0 z-50 mx-auto w-full max-w-[560px] rounded-t-lg border-x border-t border-border bg-surface px-4 pt-4 pb-[calc(1rem+env(safe-area-inset-bottom,0px))] transition-transform duration-200 ease-out ${
          visible ? "translate-y-0" : "translate-y-full"
        }`}
      >
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2
            id="idea-sheet-title"
            className="text-lg font-semibold text-text"
          >
            {isEditing ? "Edit idea" : "New idea"}
          </h2>

          <button
            type="button"
            onClick={handleClose}
            disabled={pending}
            aria-label="Close"
            className="inline-flex h-11 w-11 items-center justify-center rounded-lg text-text transition-colors duration-150 ease-out hover:bg-background cursor-pointer disabled:opacity-60 disabled:pointer-events-none"
          >
            <X size={20} strokeWidth={1.5} aria-hidden="true" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div>
            <label htmlFor="idea-title" className={labelClass}>
              Title
            </label>
            <input
              ref={titleRef}
              id="idea-title"
              type="text"
              required
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              disabled={pending}
              autoFocus
              autoComplete="off"
              placeholder="Rooftop movie night"
              className={fieldClass}
            />
          </div>

          <div>
            <label htmlFor="idea-description" className={labelClass}>
              Description (optional)
            </label>
            <textarea
              id="idea-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={3}
              disabled={pending}
              placeholder="Bring blankets and something to eat."
              className={`${fieldClass} resize-y`}
            />
          </div>

          {error && (
            <div
              role="alert"
              className="rounded-lg border border-border bg-background px-3.5 py-3 text-sm text-text"
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={pending}
            className="w-full min-h-11 px-4 py-3 rounded-lg bg-text text-background font-sans font-medium text-sm transition-opacity duration-150 ease-out hover:opacity-90 cursor-pointer disabled:opacity-60 disabled:pointer-events-none"
          >
            {pending
              ? isEditing
                ? "Saving..."
                : "Posting..."
              : isEditing
              ? "Save changes"
              : "Post idea"}
          </button>
        </form>
      </div>
    </>
  );
}
