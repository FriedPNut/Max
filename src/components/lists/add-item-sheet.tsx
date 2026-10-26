"use client";

import { useState } from "react";
import { addListItemAction } from "@/app/actions/lists";
import { Button, Input, Sheet, Textarea } from "@/components/ui";
import {
  ITEM_NOTE_MAX,
  ITEM_TITLE_MAX,
  cleanLink,
  type ListKind,
} from "@/lib/lists";
import type { DetailItem } from "@/components/lists/list-detail-view";

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
    <Sheet label="Add item" onClose={onClose}>
      <form onSubmit={submit} className="space-y-5 pb-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-text">Add item</h2>
          <Button variant="text" size="sm" onClick={onClose}>
            Cancel
          </Button>
        </div>

        <div>
          <label htmlFor="item-title" className="mb-2 block text-sm text-muted">
            Name
          </label>
          <Input
            id="item-title"
            type="text"
            value={title}
            maxLength={ITEM_TITLE_MAX}
            onChange={(event) => setTitle(event.target.value)}
            required
          />
        </div>

        <div>
          <label htmlFor="item-note" className="mb-2 block text-sm text-muted">
            Note (optional)
          </label>
          <Textarea
            id="item-note"
            value={note}
            maxLength={ITEM_NOTE_MAX}
            onChange={(event) => setNote(event.target.value)}
            rows={3}
            className="resize-none"
          />
        </div>

        <div>
          <label htmlFor="item-url" className="mb-2 block text-sm text-muted">
            Link (optional)
          </label>
          <Input
            id="item-url"
            type="url"
            inputMode="url"
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            placeholder="https://"
          />
        </div>

        {error && (
          <p role="alert" className="text-sm text-text">
            {error}
          </p>
        )}

        <Button
          type="submit"
          loading={pending}
          disabled={pending || title.trim().length === 0}
          className="w-full"
        >
          Add
        </Button>
      </form>
    </Sheet>
  );
}
