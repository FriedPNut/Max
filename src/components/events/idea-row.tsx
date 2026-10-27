"use client";

import Link from "next/link";
import { Ellipsis, Send } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  checkIdeaStatusAction,
  deleteIdeaAction,
  dropIdeaAction,
} from "@/app/actions/ideas";
import { IdeaVoteButton } from "@/components/events/idea-vote-button";
import { SendIdeaSheet } from "@/components/events/send-idea-sheet";
import { LocalTime } from "@/components/local-time";
import { Button, buttonStyles, Card } from "@/components/ui";
import { publishIdeaRemoval, publishIdeaUpdate } from "@/lib/idea-sync";
import { makeEventHref } from "@/lib/ideas";
import type { IdeaListItem } from "@/lib/events";

export function IdeaRow({
  idea,
  userId,
  onEdit,
  onDropped,
  onDeleted,
  onVoteChange,
  onShared,
  animateIn = false,
}: {
  idea: IdeaListItem;
  userId: string;
  onEdit: (idea: IdeaListItem) => void;
  onDropped: (ideaId: string) => void;
  onDeleted: (ideaId: string) => void;
  onVoteChange: (
    ideaId: string,
    next: { voteCount: number; hasVoted: boolean }
  ) => void;
  onShared: (message: string) => void;
  animateIn?: boolean;
}) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [pendingAction, setPendingAction] = useState<
    "drop" | "delete" | "check" | null
  >(null);
  const [error, setError] = useState<string | null>(null);
  const [alreadyEvent, setAlreadyEvent] = useState<{
    eventId: string | null;
  } | null>(null);
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

      publishIdeaUpdate(userId, { id: idea.id, status: "dropped" });
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

      publishIdeaRemoval(userId, idea.id);
      onDeleted(idea.id);
    } catch {
      setError("Couldn't delete that idea. Try again.");
    } finally {
      setPendingAction(null);
    }
  }

  /**
   * Anyone can turn an open idea into an event, so the status is re-read right
   * before the form opens. If it was scheduled a moment ago, the row says so
   * and links to the event that exists instead of opening a duplicate form.
   */
  async function makeEvent() {
    if (pendingAction) {
      return;
    }

    setMenuOpen(false);
    setError(null);
    setAlreadyEvent(null);
    setPendingAction("check");

    try {
      const result = await checkIdeaStatusAction(idea.id);

      if (result.removed) {
        publishIdeaRemoval(userId, idea.id);
        onDeleted(idea.id);
        return;
      }

      if (result.error) {
        setError(result.error);
        return;
      }

      if (result.status === "open") {
        router.push(makeEventHref(idea.id));
        return;
      }

      // The row stays put so the message is readable; moving it to Scheduled
      // on this frame would hide the explanation.
      setAlreadyEvent({ eventId: result.eventId ?? null });
    } catch {
      setError("Couldn't check that idea. Try again.");
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

  const activeEventId = alreadyEvent?.eventId ?? idea.eventId;

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

          {isOpen && (
            <button
              type="button"
              onClick={() => void makeEvent()}
              disabled={pendingAction !== null}
              className={`mt-2 ${buttonStyles({ variant: "secondary", size: "sm" })}`}
            >
              {pendingAction === "check" ? "Checking..." : "Make it an event"}
            </button>
          )}

          {alreadyEvent && (
            <p className="mt-2 text-sm text-text">
              Already an event
              {activeEventId ? (
                <>
                  {" · "}
                  <Link
                    href={`/events/${activeEventId}`}
                    className="font-semibold text-link underline underline-offset-4"
                  >
                    View it
                  </Link>
                </>
              ) : null}
            </p>
          )}
        </div>

        <div className="flex shrink-0 flex-col items-end gap-2">
          <IdeaVoteButton
            ideaId={idea.id}
            title={idea.title}
            count={idea.voteCount}
            hasVoted={idea.hasVoted}
            disabled={!isOpen || pendingAction !== null}
            onChange={(next) => {
              publishIdeaUpdate(userId, {
                id: idea.id,
                voteCount: next.voteCount,
                hasVoted: next.hasVoted,
              });
              onVoteChange(idea.id, next);
            }}
          />

          <div className="flex items-center">
            <button
              type="button"
              onClick={() => setShareOpen(true)}
              aria-label="Send to chat"
              className="inline-flex h-11 w-11 items-center justify-center rounded-lg text-text transition-[background-color,opacity,scale] duration-100 ease-out hover:bg-surface-2 cursor-pointer"
            >
              <Send size={20} strokeWidth={1.75} aria-hidden="true" />
            </button>

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

      {shareOpen && (
        <SendIdeaSheet
          ideaId={idea.id}
          ideaTitle={idea.title}
          onClose={() => setShareOpen(false)}
          onSent={onShared}
        />
      )}
    </article>
  );
}
