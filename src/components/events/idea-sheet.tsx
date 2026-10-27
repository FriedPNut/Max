"use client";

import { X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
  createIdeaAction,
  updateIdeaAction,
} from "@/app/actions/ideas";
import { Button, inputClass, Sheet, Textarea } from "@/components/ui";
import { useAutofocus } from "@/lib/use-autofocus";
import type { IdeaListItem } from "@/lib/events";

const labelClass = "mb-2 block text-sm text-muted";

type IdeaSheetProps = {
  mode: "create" | "edit";
  idea?: IdeaListItem;
  onClose: () => void;
  onCreated?: (idea: IdeaListItem) => void;
  /** Rolls the optimistic row back if the save fails. */
  onCreateFailed?: (ideaId: string, message: string) => void;
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
  onCreateFailed,
  onUpdated,
}: IdeaSheetProps) {
  const [title, setTitle] = useState(idea?.title ?? "");
  const [description, setDescription] = useState(idea?.description ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const titleRef = useRef<HTMLInputElement>(null);
  const autofocus = useAutofocus();

  useEffect(() => {
    if (autofocus) {
      titleRef.current?.focus();
    }
  }, [autofocus]);

  function handleClose() {
    if (!pending) {
      onClose();
    }
  }

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

    if (mode === "create") {
      // The row appears in the list and the sheet closes on this frame; the
      // insert happens behind them.
      const id = crypto.randomUUID();

      onCreated?.({
        id,
        title: cleanTitle,
        description: description.trim() || null,
        creatorName: "You",
        status: "open",
        eventId: null,
        createdAt: new Date().toISOString(),
        voteCount: 0,
        hasVoted: false,
        isCreator: true,
      });
      onClose();

      void createIdeaAction(cleanTitle, description, id).then((result) => {
        if (result.error) {
          onCreateFailed?.(id, result.error);
          return;
        }

        if (result.idea) {
          onCreated?.(result.idea);
        }
      });
      return;
    }

    setPending(true);

    try {
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
      onClose();
    } catch {
      setError("Couldn't save that idea. Try again.");
      setPending(false);
    }
  }

  const isEditing = mode === "edit";

  return (
    <Sheet label={isEditing ? "Edit idea" : "New idea"} onClose={handleClose}>
      <div className="mb-4 flex items-center justify-between gap-4">
        <h2
          id="idea-sheet-title"
          className="text-lg font-semibold text-text"
        >
          {isEditing ? "Edit idea" : "New idea"}
        </h2>

        <Button
          variant="secondary"
          size="sm"
          onClick={handleClose}
          disabled={pending}
          aria-label="Close"
          className="h-11 w-11 shrink-0 px-0"
        >
          <X size={24} strokeWidth={1.75} aria-hidden="true" />
        </Button>
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
            autoComplete="off"
            placeholder="Rooftop movie night"
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="idea-description" className={labelClass}>
            Description (optional)
          </label>
          <Textarea
            id="idea-description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            rows={3}
            disabled={pending}
            placeholder="Bring blankets and something to eat."
            className="resize-y"
          />
        </div>

        {error && (
          <div
            role="alert"
            className="rounded-lg bg-background px-3.5 py-3 text-sm text-text"
          >
            {error}
          </div>
        )}

        <Button type="submit" disabled={pending} className="w-full">
          {pending
            ? isEditing
              ? "Saving..."
              : "Posting..."
            : isEditing
            ? "Save changes"
            : "Post idea"}
        </Button>
      </form>
    </Sheet>
  );
}
