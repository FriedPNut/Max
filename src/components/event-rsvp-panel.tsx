"use client";

import Link from "next/link";
import { useState } from "react";
import { setRsvpAction } from "@/app/actions/events";
import { ProfileAvatar } from "@/components/profile/profile-avatar";
import {
  RSVP_CHOICES,
  RSVP_LABELS,
  RSVP_STATUSES,
  type RsvpChoice,
  type RsvpSnapshot,
  type RsvpStatus,
} from "@/lib/events";

export function EventRsvpPanel({
  eventId,
  isPast,
  currentUserId,
  initialSnapshot,
}: {
  eventId: string;
  isPast: boolean;
  currentUserId: string;
  initialSnapshot: RsvpSnapshot;
}) {
  const [snapshot, setSnapshot] = useState(initialSnapshot);
  const [selected, setSelected] = useState<RsvpStatus | null>(
    initialSnapshot.currentStatus
  );
  const [pending, setPending] = useState<RsvpChoice | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [promoted, setPromoted] = useState(false);

  const { currentStatus, waitlistPosition, goingCount, capacity, groups } =
    snapshot;
  const isFull = capacity !== null && goingCount >= capacity;

  async function choose(next: RsvpChoice) {
    if (pending || isPast || next === snapshot.currentStatus) {
      return;
    }

    const previous = snapshot;
    setSelected(next);
    setPending(next);
    setError(null);
    setPromoted(false);

    try {
      const formData = new FormData();
      formData.set("event_id", eventId);
      formData.set("status", next);
      const result = await setRsvpAction({}, formData);

      if (result.error || !result.snapshot) {
        setSelected(previous.currentStatus);
        setError(result.error ?? "Couldn't save your answer. Try again.");
        return;
      }

      setSnapshot(result.snapshot);
      setSelected(result.snapshot.currentStatus);

      if (
        previous.currentStatus === "waitlist" &&
        result.snapshot.currentStatus === "going"
      ) {
        setPromoted(true);
      }
    } catch {
      setSelected(previous.currentStatus);
      setError("Couldn't save your answer. Try again.");
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <div className="flex items-baseline justify-between gap-4">
          <h2 className="text-lg font-semibold text-text">Are you in?</h2>

          <div className="flex items-baseline gap-2">
            <span className="text-sm text-muted">
              Going {goingCount}
              {capacity !== null ? ` / ${capacity}` : ""}
            </span>
            {isFull && (
              <span className="text-sm font-medium text-text">Full</span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {RSVP_CHOICES.map((item) => {
            const isSelected = selected === item;

            return (
              <button
                key={item}
                type="button"
                onClick={() => choose(item)}
                aria-pressed={isSelected}
                disabled={pending !== null || isPast}
                className={`w-full min-h-11 px-3 py-2.5 rounded-lg border text-sm font-medium transition-colors duration-150 ease-out cursor-pointer disabled:opacity-60 disabled:pointer-events-none ${
                  isSelected
                    ? "bg-accent border-accent text-on-accent"
                    : "bg-transparent border-border text-text hover:bg-surface"
                }`}
              >
                {pending === item ? "Saving..." : RSVP_LABELS[item]}
              </button>
            );
          })}
        </div>

        {currentStatus === "waitlist" && (
          <p role="status" className="text-sm text-muted">
            You&apos;re on the waitlist
            {waitlistPosition !== null ? ` (#${waitlistPosition})` : ""}.
          </p>
        )}

        {promoted && (
          <p role="status" className="text-sm text-text">
            You&apos;re in! A spot opened up.
          </p>
        )}

        {isPast && (
          <p className="text-sm text-muted">This event has passed</p>
        )}

        {error && (
          <p role="alert" className="text-sm text-text">
            {error}
          </p>
        )}
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-text">
          Who&apos;s coming
        </h2>

        {snapshot.totalAnswers === 0 ? (
          <p className="text-sm text-muted">No answers yet.</p>
        ) : (
          <div className="border-t border-line">
            {RSVP_STATUSES.map((status) => {
              const people = groups[status];

              if (people.length === 0) {
                return null;
              }

              return (
                <div key={status} className="border-b border-line py-4">
                  <p className="text-sm text-muted">
                    {RSVP_LABELS[status]} · {people.length}
                  </p>

                  <ul className="mt-1 divide-y divide-line">
                    {people.map((person) => (
                      <li
                        key={person.id}
                        className="flex items-center gap-3 py-3"
                      >
                        {person.username ? (
                          <Link
                            href={`/u/${encodeURIComponent(person.username)}`}
                            aria-label={`View ${person.name}'s profile`}
                            className="shrink-0 transition-opacity duration-150 ease-out hover:opacity-80"
                          >
                            <ProfileAvatar
                              src={person.avatarUrl}
                              initial={
                                person.name.charAt(0).toUpperCase() || "?"
                              }
                              size={36}
                            />
                          </Link>
                        ) : (
                          <ProfileAvatar
                            src={person.avatarUrl}
                            initial={
                              person.name.charAt(0).toUpperCase() || "?"
                            }
                            size={36}
                          />
                        )}

                        {person.username ? (
                          <Link
                            href={`/u/${encodeURIComponent(person.username)}`}
                            className="text-base text-text break-words transition-opacity duration-150 ease-out hover:opacity-80"
                          >
                            {person.name}
                          </Link>
                        ) : (
                          <span className="text-base text-text break-words">
                            {person.name}
                          </span>
                        )}

                        {status === "waitlist" && (
                          <span className="ml-auto shrink-0 text-sm text-muted">
                            {person.id === currentUserId && "You · "}
                            {person.waitlistPosition !== null
                              ? `#${person.waitlistPosition}`
                              : ""}
                          </span>
                        )}

                        {status !== "waitlist" &&
                          person.id === currentUserId && (
                            <span className="ml-auto text-sm text-muted">
                              You
                            </span>
                          )}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
