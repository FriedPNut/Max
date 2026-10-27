"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useState } from "react";
import { Card, Toast } from "@/components/ui";
import { writeCache } from "@/lib/cache";
import { IdeasWidget } from "@/components/events/ideas-widget";
import { ComingUp } from "@/components/events/coming-up";
import { QuickLinks } from "@/components/events/quick-links";
import type { EventListItem, IdeaListItem } from "@/lib/events";
import type { ArrivalRecord } from "@/lib/event-arrivals";
import {
  daysUntilBirthday,
  formatBirthdayDate,
  nextBirthday,
} from "@/lib/birthdays";
import { useAppRefreshSignal } from "@/lib/app-refresh";
import { useNewIds } from "@/lib/use-new-ids";
import { useToday } from "@/lib/use-today";
import { useIdeaSync, type IdeaSyncDetail } from "@/lib/idea-sync";

// The calendar and the add-idea sheet are below the fold or on demand.
const CalendarSection = dynamic(
  () =>
    import("@/components/events/calendar-section").then(
      (m) => m.CalendarSection
    ),
  { ssr: false }
);
const IdeaSheet = dynamic(
  () => import("@/components/events/idea-sheet").then((m) => m.IdeaSheet),
  { ssr: false }
);

function toDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate()
  ).padStart(2, "0")}`;
}

export type UpcomingBirthday = {
  name: string;
  month: number;
  day: number;
};

export function EventsHome({
  userId,
  initialIdeas,
  events,
  pollVoteCount,
  comingUpEvents,
  onWayArrivals,
  upcomingBirthday,
}: {
  userId: string;
  initialIdeas: IdeaListItem[];
  events: EventListItem[];
  pollVoteCount: number;
  comingUpEvents: EventListItem[];
  /** Raw rows: the browser works out "about 10 min" from its own clock. */
  onWayArrivals: Record<string, ArrivalRecord>;
  upcomingBirthday: UpcomingBirthday | null;
}) {
  // The birthday countdown and the "plan something" date are the viewer's
  // local day, so they are only produced in the browser.
  const today = useToday();
  const birthdayDays =
    today && upcomingBirthday
      ? daysUntilBirthday(upcomingBirthday.month, upcomingBirthday.day, today)
      : null;
  const birthdayPlanHref = upcomingBirthday
    ? `/events/new?title=${encodeURIComponent(
        `${upcomingBirthday.name}’s birthday`
      )}${
        today
          ? `&date=${toDateKey(
              nextBirthday(upcomingBirthday.month, upcomingBirthday.day, today)
            )}`
          : ""
      }`
    : "";
  const [ideas, setIdeas] = useState(initialIdeas);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [createdIdeaId, setCreatedIdeaId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const newIds = useNewIds(
    ideas.map((idea) => idea.id),
    initialIdeas.map((idea) => idea.id)
  );
  const refreshSignal = useAppRefreshSignal();

  // A vote or a conversion in a chat card, or a delete anywhere, reaches the
  // widget without a refetch.
  const applyIdeaSync = useCallback((detail: IdeaSyncDetail) => {
    if (detail.kind === "remove") {
      setIdeas((current) => current.filter((idea) => idea.id !== detail.ideaId));
      return;
    }

    setIdeas((current) =>
      current.map((idea) =>
        idea.id === detail.idea.id ? { ...idea, ...detail.idea } : idea
      )
    );
  }, []);
  useIdeaSync(userId, applyIdeaSync);

  useEffect(() => {
    if (refreshSignal) {
      setIdeas(initialIdeas);
    }
  }, [refreshSignal, initialIdeas]);

  // The server list is the truth, so an empty answer clears the cached copy:
  // an idea deleted with its event must never come back from storage.
  useEffect(() => {
    writeCache(userId, "ideas", ideas.slice(0, 10));
  }, [ideas, userId]);

  function handleCreated(idea: IdeaListItem) {
    // Called once optimistically and again with the saved row: same id, so the
    // second call updates in place instead of duplicating it.
    setIdeas((current) => {
      const at = current.findIndex((row) => row.id === idea.id);

      if (at === -1) {
        return [...current, idea];
      }

      const next = current.slice();
      next[at] = idea;
      return next;
    });
    setCreatedIdeaId(idea.id);
  }

  function handleCreateFailed(ideaId: string, message: string) {
    setIdeas((current) => current.filter((idea) => idea.id !== ideaId));
    setToast(message);
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
      <ComingUp items={comingUpEvents} onWayArrivals={onWayArrivals} />

      {upcomingBirthday && (
        <Card className="flex items-center justify-between gap-3 px-4 py-3">
          <p className="min-w-0 text-base text-text">
            {upcomingBirthday.name}&apos;s birthday{" "}
            {birthdayDays === null
              ? "is coming up"
              : birthdayDays === 0
              ? "is today"
              : birthdayDays === 1
              ? "is tomorrow"
              : `is in ${birthdayDays} days`}
            <span className="text-muted"> · {formatBirthdayDate(upcomingBirthday.month, upcomingBirthday.day)}</span>
          </p>
          <Link
            href={birthdayPlanHref}
            className="inline-flex min-h-11 shrink-0 items-center text-sm font-semibold text-link"
          >
            Plan something
          </Link>
        </Card>
      )}

      <div className="space-y-2">
        <IdeasWidget
          userId={userId}
          ideas={ideas}
          onVoteChange={handleVoteChange}
          onAddIdea={() => setSheetOpen(true)}
          createdIdeaId={createdIdeaId}
          newIds={newIds}
        />

        <div className="pt-2">
          <QuickLinks />
        </div>

        {pollVoteCount > 0 && (
          <Link
            href="/events/ideas?view=events#needs-a-time"
            className="block px-1 text-sm font-semibold text-link transition-opacity duration-200 ease-out hover:opacity-80"
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
          onCreateFailed={handleCreateFailed}
        />
      )}

      <Toast message={toast} onDone={() => setToast(null)} />
    </div>
  );
}
