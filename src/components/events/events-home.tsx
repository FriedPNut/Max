"use client";

import Link from "next/link";
import { useState } from "react";
import { CalendarSection } from "@/components/events/calendar-section";
import { IdeaSheet } from "@/components/events/idea-sheet";
import { IdeasWidget } from "@/components/events/ideas-widget";
import { ComingUp } from "@/components/events/coming-up";
import { QuickLinks } from "@/components/events/quick-links";
import type { EventListItem, IdeaListItem } from "@/lib/events";
import { formatBirthdayDate, nextBirthday } from "@/lib/birthdays";

function toDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate()
  ).padStart(2, "0")}`;
}

export type UpcomingBirthday = {
  name: string;
  month: number;
  day: number;
  days: number;
};

export function EventsHome({
  initialIdeas,
  events,
  pollVoteCount,
  comingUpEvents,
  onWayEtas,
  upcomingBirthday,
}: {
  initialIdeas: IdeaListItem[];
  events: EventListItem[];
  pollVoteCount: number;
  comingUpEvents: EventListItem[];
  onWayEtas: Record<string, string>;
  upcomingBirthday: UpcomingBirthday | null;
}) {
  const [ideas, setIdeas] = useState(initialIdeas);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [createdIdeaId, setCreatedIdeaId] = useState<string | null>(null);

  function handleCreated(idea: IdeaListItem) {
    setIdeas((current) => [...current, idea]);
    setCreatedIdeaId(idea.id);
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
    <div className="space-y-8">
      <ComingUp items={comingUpEvents} onWayEtas={onWayEtas} />

      {upcomingBirthday && (
        <section className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface px-4 py-3">
          <p className="min-w-0 text-base text-text">
            {upcomingBirthday.name}&apos;s birthday{" "}
            {upcomingBirthday.days === 0
              ? "is today"
              : upcomingBirthday.days === 1
              ? "is tomorrow"
              : `is in ${upcomingBirthday.days} days`}
            <span className="text-muted"> · {formatBirthdayDate(upcomingBirthday.month, upcomingBirthday.day)}</span>
          </p>
          <Link
            href={`/events/new?title=${encodeURIComponent(`${upcomingBirthday.name}’s birthday`)}&date=${toDateKey(nextBirthday(upcomingBirthday.month, upcomingBirthday.day))}`}
            className="inline-flex min-h-11 shrink-0 items-center text-sm font-medium text-text underline underline-offset-4"
          >
            Plan something
          </Link>
        </section>
      )}

      <div className="space-y-2">
        <IdeasWidget
          ideas={ideas}
          onVoteChange={handleVoteChange}
          onAddIdea={() => setSheetOpen(true)}
          createdIdeaId={createdIdeaId}
        />

        <div className="pt-2">
          <QuickLinks />
        </div>

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
