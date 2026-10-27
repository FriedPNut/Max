"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createListAction } from "@/app/actions/lists";
import { Button, Chip, Input, Sheet } from "@/components/ui";
import {
  LIST_KINDS,
  LIST_KIND_LABELS,
  LIST_TITLE_MAX,
  type ListKind,
} from "@/lib/lists";

export function CreateListSheet({
  onClose,
  onCreated,
  onFailed,
}: {
  onClose: () => void;
  /** Adds the row to the list and closes the sheet before the save lands. */
  onCreated?: (row: { id: string; title: string; kind: ListKind }) => void;
  onFailed?: (id: string, message: string) => void;
}) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [kind, setKind] = useState<ListKind>("general");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (saving) {
      return;
    }

    const cleanTitle = title.trim();

    if (!cleanTitle) {
      setError("Give the list a name.");
      return;
    }

    setSaving(true);
    setError(null);
    const id = crypto.randomUUID();

    onCreated?.({ id, title: cleanTitle, kind });
    onClose();

    const result = await createListAction({ id, title: cleanTitle, kind });

    if (result.error || !result.id) {
      onFailed?.(id, result.error ?? "Couldn't create that list. Try again.");
      return;
    }

    router.push(`/lists/${result.id}`);
  }

  return (
    <Sheet label="New list" onClose={onClose}>
      <form onSubmit={submit} className="space-y-5 pb-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-text">New list</h2>
          <Button variant="text" size="sm" onClick={onClose}>
            Cancel
          </Button>
        </div>

        <div>
          <label htmlFor="list-title" className="mb-2 block text-sm text-muted">
            Name
          </label>
          <Input
            id="list-title"
            type="text"
            value={title}
            maxLength={LIST_TITLE_MAX}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Taco spots"
            required
          />
        </div>

        <fieldset>
          <legend className="mb-2 text-sm text-muted">Kind</legend>
          <div className="flex flex-wrap gap-2">
            {LIST_KINDS.map((option) => (
              <Chip
                key={option}
                selected={kind === option}
                onClick={() => setKind(option)}
              >
                {LIST_KIND_LABELS[option]}
              </Chip>
            ))}
          </div>
        </fieldset>

        {error && (
          <p role="alert" className="text-sm text-text">
            {error}
          </p>
        )}

        <Button type="submit" className="w-full">
          Create list
        </Button>
      </form>
    </Sheet>
  );
}
