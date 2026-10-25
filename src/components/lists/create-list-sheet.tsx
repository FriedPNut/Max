"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createListAction } from "@/app/actions/lists";
import {
  LIST_KINDS,
  LIST_KIND_LABELS,
  LIST_TITLE_MAX,
  type ListKind,
} from "@/lib/lists";

const fieldClass =
  "w-full bg-surface text-text placeholder:text-muted border border-border rounded-lg px-3 py-3 text-base leading-snug focus:outline-2 focus:outline-offset-0 focus:outline-text";

export function CreateListSheet({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [kind, setKind] = useState<ListKind>("general");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (pending) {
      return;
    }

    setPending(true);
    setError(null);
    const result = await createListAction({ title, kind });
    setPending(false);

    if (result.error || !result.id) {
      setError(result.error ?? "Couldn't create that list. Try again.");
      return;
    }

    onClose();
    router.push(`/lists/${result.id}`);
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="New list"
      className="fixed inset-0 z-50 flex items-end justify-center bg-scrim/40"
      onClick={onClose}
    >
      <form
        onSubmit={submit}
        onClick={(event) => event.stopPropagation()}
        className="w-full max-w-[560px] space-y-5 rounded-t-lg border-t border-border bg-background p-4 pb-8"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-text">New list</h2>
          <button
            type="button"
            onClick={onClose}
            className="min-h-11 px-3 text-sm text-muted hover:text-text cursor-pointer"
          >
            Cancel
          </button>
        </div>

        <div>
          <label htmlFor="list-title" className="mb-2 block text-sm text-muted">
            Name
          </label>
          <input
            id="list-title"
            type="text"
            value={title}
            maxLength={LIST_TITLE_MAX}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Taco spots"
            required
            className={fieldClass}
          />
        </div>

        <fieldset>
          <legend className="mb-2 text-sm text-muted">Kind</legend>
          <div className="flex flex-wrap gap-2">
            {LIST_KINDS.map((option) => (
              <button
                key={option}
                type="button"
                aria-pressed={kind === option}
                onClick={() => setKind(option)}
                className={`min-h-11 rounded-lg border px-4 text-sm transition-colors duration-150 ease-out cursor-pointer ${
                  kind === option
                    ? "border-text bg-text text-background"
                    : "border-border bg-transparent text-text hover:bg-surface"
                }`}
              >
                {LIST_KIND_LABELS[option]}
              </button>
            ))}
          </div>
        </fieldset>

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
          {pending ? "Creating..." : "Create list"}
        </button>
      </form>
    </div>
  );
}
