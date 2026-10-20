"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { IdeaVoteButton } from "@/components/events/idea-vote-button";
import type { IdeaListItem } from "@/lib/events";

export function IdeasWidget({
  ideas,
  onVoteChange,
}: {
  ideas: IdeaListItem[];
  onVoteChange: (
    ideaId: string,
    next: { voteCount: number; hasVoted: boolean }
  ) => void;
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

  return (
    <section className="overflow-hidden rounded-lg border border-line bg-surface">
      <Link
        href="/events/ideas"
        className="flex min-h-12 items-center justify-between gap-4 px-4 py-3 transition-colors duration-150 ease-out hover:bg-background"
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

      {topIdeas.length === 0 ? (
        <p className="border-t border-line px-4 py-4 text-sm text-muted">
          No ideas yet. Tap + to add one.
        </p>
      ) : (
        topIdeas.map((idea) => (
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
