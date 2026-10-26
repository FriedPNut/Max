"use client";

import Link from "next/link";
import { ChevronRight, Plus } from "lucide-react";
import { IdeaVoteButton } from "@/components/events/idea-vote-button";
import { Button, Card } from "@/components/ui";
import type { IdeaListItem } from "@/lib/events";

export function IdeasWidget({
  ideas,
  onVoteChange,
  onAddIdea,
  createdIdeaId,
  newIds,
}: {
  ideas: IdeaListItem[];
  onVoteChange: (
    ideaId: string,
    next: { voteCount: number; hasVoted: boolean }
  ) => void;
  onAddIdea: () => void;
  createdIdeaId?: string | null;
  newIds?: Set<string>;
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
    <Card className="overflow-hidden">
      <div className="flex items-center gap-1 px-4 py-2">
        <Link
          href="/events/ideas"
          className="press-row flex min-h-11 flex-1 items-center justify-between gap-4 transition-colors duration-200 ease-out hover:opacity-70"
        >
          <div className="flex items-baseline gap-2">
            <h2 className="text-lg font-semibold text-text">Ideas</h2>
            <span className="text-sm text-muted">{openIdeas.length}</span>
          </div>

          <span className="flex items-center gap-1 text-sm text-muted">
            See all
            <ChevronRight size={24} strokeWidth={1.75} aria-hidden="true" />
          </span>
        </Link>

        <Button
          variant="secondary"
          onClick={onAddIdea}
          aria-label="Add idea"
          className="h-11 w-11 shrink-0 px-0"
        >
          <Plus size={24} strokeWidth={1.75} aria-hidden="true" />
        </Button>
      </div>

      {shownIdeas.length === 0 ? (
        <p className="border-t border-line px-4 py-4 text-sm text-muted">
          No ideas yet. Tap + to add one.
        </p>
      ) : (
        shownIdeas.map((idea) => (
          <div
            key={idea.id}
            className={`flex min-h-14 items-start justify-between gap-3 border-t border-line px-4 py-3 ${
              newIds?.has(idea.id) ? "row-enter" : ""
            }`}
          >
            <div className="min-w-0">
              <p className="text-base font-semibold text-text break-words">
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
    </Card>
  );
}
