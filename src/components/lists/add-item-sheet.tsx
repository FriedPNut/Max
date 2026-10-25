"use client";

import { useState } from "react";
import { addListItemAction } from "@/app/actions/lists";
import {
  ITEM_NOTE_MAX,
  ITEM_TITLE_MAX,
  cleanLink,
  type ListKind,
} from "@/lib/lists";
import type { DetailItem } from "@/components/lists/list-detail-view";

const fieldClass =
  "w-full bg-surface text-text placeholder:text-muted border border-border rounded-lg px-3 py-3 text-base leading-snug focus:outline-2 focus:outline-offset-0 focus:outline-text";

export function AddItemSheet({
  listId,
  onClose,
  onAdded,
}: {
  listId: string;
  listKind: ListKind;
  onClose: () => void;
  onAdded: (item: DetailItem) => void;
}) {
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [url, setUrl] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (pending) {
      return;
    }

    setPending(true);
    setError(null);
    const result = await addListItemAction({ listId, title, note, url });
    setPending(false);

    if (result.error || !result.id) {
      setError(result.error ?? "Couldn't add that item. Try again.");
      return;
    }

    onAdded({
      id: result.id,
      title: title.trim(),
      note: note.trim() || null,
      url: cleanLink(url),
      addedByName: "You",
      addedByMe: true,
      done: false,
      doneByName: null,
      voteCount: 0,
      votedByMe: false,
      eventIdeaId: null,
      createdAt: new Date().toISOString(),
    });
    onClose();
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Add item"
      className="fixed inset-0 z-50 flex items-end justify-center bg-scrim/40"
      onClick={onClose}
    >
      <form
        onSubmit={submit}
        onClick={(event) => event.stopPropagation()}
        className="w-full max-w-[560px] space-y-5 rounded-t-lg border-t border-border bg-background p-4 pb-8"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-text">Add item</h2>
          <button
            type="button"
            onClick={onClose}
            className="min-h-11 px-3 text-sm text-muted hover:text-text cursor-pointer"
          >
            Cancel
          </button>
        </div>

        <div>
          <label htmlFor="item-title" className="mb-2 block text-sm text-muted">
            Name
          </label>
          <input
            id="item-title"
            type="text"
            value={title}
            maxLength={ITEM_TITLE_MAX}
            onChange={(event) => setTitle(event.target.value)}
            required
            className={fieldClass}
          />
        </div>

        <div>
          <label htmlFor="item-note" className="mb-2 block text-sm text-muted">
            Note (optional)
          </label>
          <textarea
            id="item-note"
            value={note}
            maxLength={ITEM_NOTE_MAX}
            onChange={(event) => setNote(event.target.value)}
            rows={3}
            className={`${fieldClass} resize-none`}
          />
        </div>

        <div>
          <label htmlFor="item-url" className="mb-2 block text-sm text-muted">
            Link (optional)
          </label>
          <input
            id="item-url"
            type="url"
            inputMode="url"
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            placeholder="https://"
            className={fieldClass}
          />
        </div>

        {error && (
          <p role="alert" className="text-sm text-text">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={pending || title.trim().length === 0}
          className="min-h-11 w-full rounded-lg bg-text px-4 py-3 text-sm font-medium text-background transition-opacity duration-150 ease-out hover:opacity-90 cursor-pointer disabled:opacity-60 disabled:pointer-events-none"
        >
          {pending ? "Adding..." : "Add"}
        </button>
      </form>
    </div>
  );
}
