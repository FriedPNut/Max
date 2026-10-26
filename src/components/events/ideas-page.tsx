"use client";

import Link from "next/link";
import { ArrowLeft, Plus } from "lucide-react";
import { useState } from "react";
import { EventRow } from "@/components/events/event-row";
import { IdeaRow } from "@/components/events/idea-row";
import { IdeaSheet } from "@/components/events/idea-sheet";
import { Button, Chip, SegmentedControl } from "@/components/ui";
import { useHydrated } from "@/lib/use-hydrated";
import { useNewIds } from "@/lib/use-new-ids";
import type { EventListItem, IdeaListItem, IdeaStatus } from "@/lib/events";

type IdeaView = "ideas" | "events";
type IdeaFilter = Extract<IdeaStatus, "open" | "scheduled">;

type SheetState =
  | { mode: "create" }
  | { mode: "edit"; idea: IdeaListItem }
  | null;

export function IdeasPage({
  initialIdeas,
  events,
  nowIso,
  initialView = "ideas",
}: {
  initialIdeas: IdeaListItem[];
  events: EventListItem[];
  nowIso: string;
  initialView?: IdeaView;
}) {
  const [ideas, setIdeas] = useState(initialIdeas);
  const [view, setView] = useState<IdeaView>(initialView);
  const [filter, setFilter] = useState<IdeaFilter>("open");
  const [sheet, setSheet] = useState<SheetState>(null);
  const newIds = useNewIds(
    ideas.map((idea) => idea.id),
    initialIdeas.map((idea) => idea.id)
  );

  const visibleIdeas = ideas
    .filter((idea) => idea.status === filter)
    .sort((a, b) => {
      const difference = b.voteCount - a.voteCount;

      if (difference !== 0) {
        return difference;
      }

      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

  function handleCreated(idea: IdeaListItem) {
    setIdeas((current) => [...current, idea]);
    setFilter("open");
    setView("ideas");
  }

  function handleUpdated(
    ideaId: string,
    patch: { title: string; description: string | null }
  ) {
    setIdeas((current) =>
      current.map((idea) =>
        idea.id === ideaId
          ? {
              ...idea,
              title: patch.title,
              description: patch.description,
            }
          : idea
      )
    );
  }

  function handleDropped(ideaId: string) {
    setIdeas((current) => current.filter((idea) => idea.id !== ideaId));
  }

  function handleDeleted(ideaId: string) {
    setIdeas((current) => current.filter((idea) => idea.id !== ideaId));
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
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Link
            href="/events"
            aria-label="Back to events"
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-text transition-colors duration-200 ease-out hover:bg-surface-2"
          >
            <ArrowLeft size={24} strokeWidth={1.75} aria-hidden="true" />
          </Link>

          <h1 className="text-[22px] font-bold leading-tight text-text">
            Ideas
          </h1>
        </div>

        <Button
          variant="secondary"
          onClick={() => setSheet({ mode: "create" })}
          aria-label="Add idea"
          className="h-11 w-11 shrink-0 px-0"
        >
          <Plus size={24} strokeWidth={1.75} aria-hidden="true" />
        </Button>
      </div>

      <SegmentedControl
        label="Ideas sections"
        value={view}
        onChange={setView}
        options={[
          { value: "ideas", label: "Ideas" },
          { value: "events", label: "All events" },
        ]}
      />

      {view === "ideas" ? (
        <div className="space-y-4">
          <div
            role="group"
            aria-label="Idea status"
            className="flex items-center gap-2"
          >
            {(["open", "scheduled"] as const).map((status) => (
              <Chip
                key={status}
                selected={filter === status}
                onClick={() => setFilter(status)}
              >
                {status === "open" ? "Open" : "Scheduled"}
              </Chip>
            ))}
          </div>

          {visibleIdeas.length === 0 ? (
            <p className="text-sm text-muted">
              {filter === "open"
                ? "No ideas yet. Tap + to add one."
                : "Nothing scheduled yet."}
            </p>
          ) : (
            <div className="border-t border-line">
              {visibleIdeas.map((idea) => (
                <IdeaRow
                  key={idea.id}
                  idea={idea}
                  onEdit={(selected) =>
                    setSheet({ mode: "edit", idea: selected })
                  }
                  onDropped={handleDropped}
                  onDeleted={handleDeleted}
                  onVoteChange={handleVoteChange}
                  animateIn={newIds.has(idea.id)}
                />
              ))}
            </div>
          )}
        </div>
      ) : (
        <AllEventsView events={events} nowIso={nowIso} />
      )}

      {sheet?.mode === "create" && (
        <IdeaSheet
          mode="create"
          onClose={() => setSheet(null)}
          onCreated={handleCreated}
        />
      )}

      {sheet?.mode === "edit" && (
        <IdeaSheet
          mode="edit"
          idea={sheet.idea}
          onClose={() => setSheet(null)}
          onUpdated={(patch) => handleUpdated(sheet.idea.id, patch)}
        />
      )}
    </div>
  );
}

function AllEventsView({
  events,
  nowIso,
}: {
  events: EventListItem[];
  nowIso: string;
}) {
  const hydrated = useHydrated();
  const nowMs = hydrated ? Date.now() : new Date(nowIso).getTime();
  const needsTime = events
    .filter((event) => event.poll_open)
    .sort(
      (a, b) =>
        new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime()
    );
  const scheduled = events.filter((event) => !event.poll_open);

  const upcoming = scheduled
    .filter((event) => new Date(event.starts_at).getTime() >= nowMs)
    .sort(
      (a, b) =>
        new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime()
    );

  const past = scheduled
    .filter((event) => new Date(event.starts_at).getTime() < nowMs)
    .sort(
      (a, b) =>
        new Date(b.starts_at).getTime() - new Date(a.starts_at).getTime()
    );

  return (
    <div className="space-y-8">
      {needsTime.length > 0 && (
        <section id="needs-a-time" className="space-y-3">
          <div className="flex items-baseline justify-between gap-4">
            <h2 className="text-lg font-semibold text-text">Needs a time</h2>
            <span className="text-sm text-muted">{needsTime.length}</span>
          </div>

          <div className="border-t border-line">
            {needsTime.map((event) => (
              <EventRow key={event.id} event={event} />
            ))}
          </div>
        </section>
      )}

      <section className="space-y-3">
        <div className="flex items-baseline justify-between gap-4">
          <h2 className="text-lg font-semibold text-text">Upcoming</h2>
          <span className="text-sm text-muted">{upcoming.length}</span>
        </div>

        {upcoming.length === 0 ? (
          <p className="text-sm text-muted">Nothing planned yet.</p>
        ) : (
          <div className="border-t border-line">
            {upcoming.map((event) => (
              <EventRow key={event.id} event={event} />
            ))}
          </div>
        )}
      </section>

      {past.length > 0 && (
        <details className="group">
          <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-4 border-t border-line py-3 [&::-webkit-details-marker]:hidden">
            <span className="text-lg font-semibold text-text">
              Past events{" "}
              <span className="text-sm font-normal text-muted">
                {past.length}
              </span>
            </span>

            <span className="text-sm text-muted group-open:hidden">Show</span>
            <span className="hidden text-sm text-muted group-open:inline">
              Hide
            </span>
          </summary>

          <div className="border-t border-line">
            {past.map((event) => (
              <EventRow key={event.id} event={event} muted />
            ))}
          </div>
        </details>
      )}
    </div>
  );
}
