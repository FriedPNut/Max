"use client";

import Link from "next/link";
import { ChevronRight, Plus } from "lucide-react";
import { IdeaVoteButton } from "@/components/events/idea-vote-button";
import type { IdeaListItem } from "@/lib/events";

export function IdeasWidget({
  ideas,
  onVoteChange,
  onAddIdea,
  createdIdeaId,
}: {
  ideas: IdeaListItem[];
  onVoteChange: (
    ideaId: string,
    next: { voteCount: number; hasVoted: boolean }
  ) => void;
  onAddIdea: () => void;
  createdIdeaId?: string | null;
}) {
  const openIdeas = ideas.filter((idea) => idea.status === "open");
  const topIdeas = [...openIdeas]
    .sort((a, b) => {
      const difference = b.voteCount - a.voteCount;

      if (difference !== 0) {
        return difference;
      }

      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    })
    .slice(0, 3);

  // A just-created idea has no votes yet, so keep it visible after the top three.
  const shownIdeas =
    createdIdeaId && !topIdeas.some((idea) => idea.id === createdIdeaId)
      ? [...topIdeas, ...openIdeas.filter((idea) => idea.id === createdIdeaId)]
      : topIdeas;

  return (
    <section className="overflow-hidden rounded-lg border border-border bg-surface">
      <div className="flex items-center gap-1 px-2 py-1">
        <Link
          href="/events/ideas"
          className="flex min-h-11 flex-1 items-center justify-between gap-4 rounded-lg px-2 transition-colors duration-150 ease-out hover:bg-background"
        >
          <div className="flex items-baseline gap-2">
            <h2 className="text-lg font-semibold text-text">Ideas</h2>
            <span className="text-sm text-muted">{openIdeas.length}</span>
          </div>

          <span className="flex items-center gap-1 text-sm text-muted">
            See all
            <ChevronRight size={20} strokeWidth={1.5} aria-hidden="true" />
          </span>
        </Link>

        <button
          type="button"
          onClick={onAddIdea}
          aria-label="Add idea"
          className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-text transition-colors duration-150 ease-out hover:bg-background cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-text"
        >
          <Plus size={20} strokeWidth={1.5} aria-hidden="true" />
        </button>
      </div>

      {shownIdeas.length === 0 ? (
        <p className="border-t border-line px-4 py-4 text-sm text-muted">
          No ideas yet. Tap + to add one.
        </p>
      ) : (
        shownIdeas.map((idea) => (
          <div
            key={idea.id}
            className="flex items-start justify-between gap-3 border-t border-line px-4 py-3"
          >
            <div className="min-w-0">
              <p className="text-base font-medium text-text break-words">
                {idea.title}
              </p>
              <p className="mt-0.5 text-sm text-muted break-words">
                Suggested by {idea.creatorName}
              </p>
            </div>

            <IdeaVoteButton
              ideaId={idea.id}
              title={idea.title}
              count={idea.voteCount}
              hasVoted={idea.hasVoted}
              onChange={(next) => onVoteChange(idea.id, next)}
            />
          </div>
        ))
      )}
    </section>
  );
}
