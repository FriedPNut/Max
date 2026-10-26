"use client";

import Link from "next/link";
import { Ellipsis } from "lucide-react";
import { useState } from "react";
import {
  deleteIdeaAction,
  dropIdeaAction,
} from "@/app/actions/ideas";
import { IdeaVoteButton } from "@/components/events/idea-vote-button";
import { LocalTime } from "@/components/local-time";
import { Button, buttonStyles, Card } from "@/components/ui";
import type { IdeaListItem } from "@/lib/events";

export function IdeaRow({
  idea,
  onEdit,
  onDropped,
  onDeleted,
  onVoteChange,
  animateIn = false,
}: {
  idea: IdeaListItem;
  onEdit: (idea: IdeaListItem) => void;
  onDropped: (ideaId: string) => void;
  onDeleted: (ideaId: string) => void;
  onVoteChange: (
    ideaId: string,
    next: { voteCount: number; hasVoted: boolean }
  ) => void;
  animateIn?: boolean;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [pendingAction, setPendingAction] = useState<"drop" | "delete" | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);
  const isOpen = idea.status === "open";

  async function handleDrop() {
    if (pendingAction) {
      return;
    }

    setMenuOpen(false);
    setError(null);
    setPendingAction("drop");

    try {
      const result = await dropIdeaAction(idea.id);

      if (result.error) {
        setError(result.error);
        return;
      }

      onDropped(idea.id);
    } catch {
      setError("Couldn't drop that idea. Try again.");
    } finally {
      setPendingAction(null);
    }
  }

  async function handleDelete() {
    if (pendingAction) {
      return;
    }

    setError(null);
    setPendingAction("delete");

    try {
      const result = await deleteIdeaAction(idea.id);

      if (result.error) {
        setError(result.error);
        return;
      }

      onDeleted(idea.id);
    } catch {
      setError("Couldn't delete that idea. Try again.");
    } finally {
      setPendingAction(null);
    }
  }

  const titleNode =
    idea.status === "scheduled" && idea.eventId ? (
      <Link
        href={`/events/${idea.eventId}`}
        className="text-base font-semibold text-text break-words transition-opacity duration-200 ease-out hover:opacity-80"
      >
        {idea.title}
      </Link>
    ) : (
      <p className="text-base font-semibold text-text break-words">{idea.title}</p>
    );

  return (
    <article
      className={`-mx-4 border-b border-line px-4 py-4 last:border-b-0 ${
        animateIn ? "row-enter" : ""
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          {titleNode}

          {idea.description && (
            <p className="mt-1 text-base leading-relaxed text-text break-words">
              {idea.description}
            </p>
          )}

          <p className="mt-1 text-sm text-muted break-words">
            Suggested by {idea.creatorName} ·{" "}
            <LocalTime iso={idea.createdAt} format="card" />
          </p>

          {idea.status === "scheduled" && idea.eventId && (
            <Link
              href={`/events/${idea.eventId}`}
              className="mt-1 inline-flex min-h-11 items-center text-sm font-semibold text-link transition-opacity duration-200 ease-out hover:opacity-80"
            >
              View event
            </Link>
          )}

          {idea.isCreator && isOpen && (
            <Link
              href={`/events/new?idea=${idea.id}`}
              className={`mt-2 ${buttonStyles({ variant: "secondary", size: "sm" })}`}
            >
              Make it an event
            </Link>
          )}
        </div>

        <div className="flex shrink-0 flex-col items-end gap-2">
          <IdeaVoteButton
            ideaId={idea.id}
            title={idea.title}
            count={idea.voteCount}
            hasVoted={idea.hasVoted}
            disabled={!isOpen || pendingAction !== null}
            onChange={(next) => onVoteChange(idea.id, next)}
          />

          {idea.isCreator && (
            <div className="relative">
              <button
                type="button"
                onClick={() => setMenuOpen((current) => !current)}
                disabled={pendingAction !== null}
                aria-label="Idea options"
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                className="inline-flex h-11 w-11 items-center justify-center rounded-lg text-text transition-[background-color,opacity,scale] duration-100 ease-out hover:bg-surface-2 cursor-pointer disabled:pointer-events-none disabled:opacity-40"
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

                  <div
                    role="menu"
                    className="absolute right-0 top-11 z-20 w-44 rounded-card border border-line bg-surface py-1 shadow-pop"
                  >
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setMenuOpen(false);
                        onEdit(idea);
                      }}
                      className="flex min-h-11 w-full items-center px-3 text-left text-sm text-text transition-colors duration-200 ease-out hover:bg-surface-2 cursor-pointer"
                    >
                      Edit
                    </button>

                    <button
                      type="button"
                      role="menuitem"
                      onClick={handleDrop}
                      className="flex min-h-11 w-full items-center px-3 text-left text-sm text-text transition-colors duration-200 ease-out hover:bg-surface-2 cursor-pointer"
                    >
                      Drop idea
                    </button>

                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setMenuOpen(false);
                        setConfirmingDelete(true);
                      }}
                      className="flex min-h-11 w-full items-center px-3 text-left text-sm text-danger transition-colors duration-200 ease-out hover:bg-surface-2 cursor-pointer"
                    >
                      Delete
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {pendingAction === "drop" && (
        <p className="mt-2 text-sm text-muted">Dropping...</p>
      )}

      {error && (
        <p role="alert" className="mt-2 text-sm text-text">
          {error}
        </p>
      )}

      {confirmingDelete && (
        <Card className="mt-3 space-y-3 p-3">
          <p className="text-sm text-text">
            Delete this idea? It can&apos;t be undone.
          </p>

          <div className="flex flex-wrap gap-2">
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={pendingAction !== null}
            >
              {pendingAction === "delete" ? "Deleting..." : "Delete"}
            </Button>

            <Button
              variant="secondary"
              onClick={() => setConfirmingDelete(false)}
              disabled={pendingAction !== null}
            >
              Cancel
            </Button>
          </div>
        </Card>
      )}
    </article>
  );
}
