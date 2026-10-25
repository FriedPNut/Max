"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import {
  deleteListAction,
  renameListAction,
  deleteListItemAction,
  setListItemDoneAction,
  suggestListItemAsIdeaAction,
  toggleListItemVoteAction,
} from "@/app/actions/lists";
import { AddItemSheet } from "@/components/lists/add-item-sheet";
import type { ListKind } from "@/lib/lists";

export type DetailItem = {
  id: string;
  title: string;
  note: string | null;
  url: string | null;
  addedByName: string;
  addedByMe: boolean;
  done: boolean;
  doneByName: string | null;
  voteCount: number;
  votedByMe: boolean;
  eventIdeaId: string | null;
  createdAt: string;
};

function ListAdminControls({
  listId,
  listTitle,
}: {
  listId: string;
  listTitle: string;
}) {
  const router = useRouter();
  const [title, setTitle] = useState(listTitle);
  const [error, setError] = useState<string | null>(null);

  async function rename() {
    setError(null);
    const result = await renameListAction({ listId, title });

    if (result.error) {
      setError(result.error);
    }
  }

  async function remove() {
    setError(null);

    if (!window.confirm("Delete this list and all its items?")) {
      return;
    }

    const result = await deleteListAction(listId);

    if (result.error) {
      setError(result.error);
      return;
    }

    router.push("/lists");
  }

  return (
    <section className="space-y-3 border-b border-line pb-6">
      <div className="flex gap-2">
        <input
          type="text"
          aria-label="List name"
          value={title}
          maxLength={60}
          onChange={(event) => setTitle(event.target.value)}
          className="min-w-0 flex-1 rounded-lg border border-border bg-surface px-3 py-2 text-base text-text focus:outline-2 focus:outline-text"
        />
        <button type="button" onClick={() => void rename()} disabled={title.trim().length === 0 || title.trim() === listTitle} className="min-h-11 shrink-0 rounded-lg border border-border px-4 text-sm text-text hover:bg-surface cursor-pointer disabled:opacity-60 disabled:pointer-events-none">
          Rename
        </button>
      </div>
      <button type="button" onClick={() => void remove()} className="min-h-11 text-sm text-muted hover:text-text cursor-pointer">
        Delete list
      </button>
      {error && (
        <p role="alert" className="text-sm text-text">
          {error}
        </p>
      )}
    </section>
  );
}

export function ListDetailView({
  listId,
  listTitle,
  listKind,
  isCreator,
  initialItems,
}: {
  listId: string;
  listTitle: string;
  listKind: ListKind;
  isCreator: boolean;
  initialItems: DetailItem[];
}) {
  const [items, setItems] = useState(initialItems);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [menuId, setMenuId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const open = useMemo(
    () =>
      items
        .filter((item) => !item.done)
        .sort((a, b) => {
          const diff = b.voteCount - a.voteCount;
          return diff !== 0
            ? diff
            : new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        }),
    [items]
  );
  const done = useMemo(() => items.filter((item) => item.done), [items]);

  function patch(id: string, change: Partial<DetailItem>) {
    setItems((current) =>
      current.map((item) => (item.id === id ? { ...item, ...change } : item))
    );
  }

  async function toggleVote(item: DetailItem) {
    setError(null);
    patch(item.id, {
      votedByMe: !item.votedByMe,
      voteCount: item.voteCount + (item.votedByMe ? -1 : 1),
    });
    const result = await toggleListItemVoteAction(item.id, item.votedByMe);

    if (result.error) {
      patch(item.id, { votedByMe: item.votedByMe, voteCount: item.voteCount });
      setError(result.error);
    }
  }

  async function markDone(item: DetailItem, nextDone: boolean) {
    setError(null);
    patch(item.id, { done: nextDone });
    const result = await setListItemDoneAction(item.id, nextDone);

    if (result.error) {
      patch(item.id, { done: item.done });
      setError(result.error);
    }
  }

  async function suggest(item: DetailItem) {
    setError(null);
    setMenuId(null);
    const result = await suggestListItemAsIdeaAction(item.id);

    if (result.error && !result.ideaId) {
      setError(result.error);
      return;
    }

    patch(item.id, { eventIdeaId: result.ideaId ?? null });
  }

  async function remove(item: DetailItem) {
    setError(null);
    setMenuId(null);

    if (!window.confirm(`Delete "${item.title}"?`)) {
      return;
    }

    const previous = items;
    setItems((current) => current.filter((row) => row.id !== item.id));
    const result = await deleteListItemAction(item.id);

    if (result.error) {
      setItems(previous);
      setError(result.error);
    }
  }

  return (
    <div className="space-y-6">
      {error && (
        <p role="alert" className="text-sm text-text">
          {error}
        </p>
      )}

      {isCreator && (
        <ListAdminControls listId={listId} listTitle={listTitle} />
      )}

      {items.length === 0 ? (
        <p className="text-sm text-muted">Nothing here yet.</p>
      ) : (
        <>
          <ul className="border-t border-line">
            {open.map((item) => (
              <li key={item.id} className="flex items-start gap-3 border-b border-line py-3">
                <input
                  type="checkbox"
                  aria-label={`Mark ${item.title} done`}
                  checked={false}
                  onChange={() => void markDone(item, true)}
                  className="mt-1 h-5 w-5 shrink-0 accent-text"
                />
                <div className="min-w-0 flex-1">
                  <p className="break-words text-base font-medium text-text">{item.title}</p>
                  {item.note && <p className="text-sm text-muted break-words">{item.note}</p>}
                  <p className="text-sm text-muted">
                    Added by {item.addedByName}
                    {item.url && (
                      <>
                        {" · "}
                        <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-text underline underline-offset-4">
                          Link
                        </a>
                      </>
                    )}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    onClick={() => void toggleVote(item)}
                    aria-pressed={item.votedByMe}
                    className={`min-h-11 rounded-lg border px-3 text-sm transition-colors duration-150 ease-out cursor-pointer ${
                      item.votedByMe
                        ? "border-text bg-text text-background"
                        : "border-border bg-transparent text-text hover:bg-surface"
                    }`}
                  >
                    ▲ {item.voteCount}
                  </button>
                  <button
                    type="button"
                    aria-label={`More options for ${item.title}`}
                    aria-expanded={menuId === item.id}
                    onClick={() => setMenuId(menuId === item.id ? null : item.id)}
                    className="min-h-11 min-w-11 rounded-lg text-muted hover:text-text cursor-pointer"
                  >
                    ...
                  </button>
                </div>
                {menuId === item.id && (
                  <div className="basis-full space-y-1 pl-8">
                    {item.eventIdeaId ? (
                      <Link href="/events/ideas" className="inline-flex min-h-11 items-center text-sm text-text underline underline-offset-4">
                        In ideas
                      </Link>
                    ) : (
                      <button type="button" onClick={() => void suggest(item)} className="min-h-11 text-sm text-text cursor-pointer">
                        Suggest as event idea
                      </button>
                    )}
                    {(item.addedByMe || isCreator) && (
                      <button type="button" onClick={() => void remove(item)} className="block min-h-11 text-sm text-muted hover:text-text cursor-pointer">
                        Delete
                      </button>
                    )}
                  </div>
                )}
              </li>
            ))}
          </ul>

          {done.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-lg font-semibold text-text">Done</h2>
              <ul className="border-t border-line">
                {done.map((item) => (
                  <li key={item.id} className="flex items-start gap-3 border-b border-line py-3">
                    <input
                      type="checkbox"
                      aria-label={`Mark ${item.title} not done`}
                      checked
                      onChange={() => void markDone(item, false)}
                      className="mt-1 h-5 w-5 shrink-0 accent-text"
                    />
                    <div className="min-w-0">
                      <p className="break-words text-base text-muted line-through">{item.title}</p>
                      {item.doneByName && (
                        <p className="text-sm text-muted">Done by {item.doneByName}</p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}

      <button
        type="button"
        onClick={() => setSheetOpen(true)}
        aria-label="Add item"
        className="fixed z-40 flex h-14 w-14 items-center justify-center rounded-full bg-text text-background transition-colors duration-150 ease-out hover:bg-text/90 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-text"
        style={{
          bottom: "calc(56px + 16px + env(safe-area-inset-bottom, 0px))",
          right: "calc(16px + env(safe-area-inset-right, 0px))",
        }}
      >
        <Plus size={24} strokeWidth={1.5} aria-hidden="true" />
      </button>

      {sheetOpen && (
        <AddItemSheet
          listId={listId}
          listKind={listKind}
          onClose={() => setSheetOpen(false)}
          onAdded={(item) => setItems((current) => [item, ...current])}
        />
      )}
    </div>
  );
}
