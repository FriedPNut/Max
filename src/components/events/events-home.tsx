"use client";

import Link from "next/link";
import { useState } from "react";
import { AddIdeaButton } from "@/components/events/add-idea-button";
import { CalendarSection } from "@/components/events/calendar-section";
import { IdeaSheet } from "@/components/events/idea-sheet";
import { IdeasWidget } from "@/components/events/ideas-widget";
import { ComingUp } from "@/components/events/coming-up";
import type { EventListItem, IdeaListItem } from "@/lib/events";

export function EventsHome({
  initialIdeas,
  events,
  pollVoteCount,
  comingUpEvents,
}: {
  initialIdeas: IdeaListItem[];
  events: EventListItem[];
  pollVoteCount: number;
  comingUpEvents: EventListItem[];
}) {
  const [ideas, setIdeas] = useState(initialIdeas);
  const [sheetOpen, setSheetOpen] = useState(false);

  function handleCreated(idea: IdeaListItem) {
    setIdeas((current) => [...current, idea]);
  }

  function handleVoteChange(
    ideaId: string,
    next: { voteCount: number; hasVoted: boolean }
  ) {
    setIdeas((current) =>
      current.map((idea) =>
        idea.id === ideaId
          ? {
              ...idea,
              voteCount: next.voteCount,
              hasVoted: next.hasVoted,
            }
          : idea
      )
    );
  }

  return (
    <div className="space-y-8 pb-24">
      <ComingUp items={comingUpEvents} />

      <div className="space-y-2">
        <IdeasWidget ideas={ideas} onVoteChange={handleVoteChange} />

        {pollVoteCount > 0 && (
          <Link
            href="/events/ideas?view=events#needs-a-time"
            className="block px-1 text-sm text-muted transition-colors duration-150 ease-out hover:text-text"
          >
            {pollVoteCount === 1
              ? "1 poll needs your vote"
              : `${pollVoteCount} polls need your vote`}
          </Link>
        )}
      </div>

      <CalendarSection events={events} />

      <AddIdeaButton onClick={() => setSheetOpen(true)} />

      {sheetOpen && (
        <IdeaSheet
          mode="create"
          onClose={() => setSheetOpen(false)}
          onCreated={handleCreated}
        />
      )}
    </div>
  );
}
