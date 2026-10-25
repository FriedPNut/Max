"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { addTripMemberAction, leaveTripAction, removeTripMemberAction } from "@/app/actions/trip-members";

type Person = { id: string; name: string; initial: string };

const buttonClass =
  "inline-flex min-h-11 items-center justify-center rounded-lg border border-border px-4 py-3 text-sm font-medium text-text transition-colors duration-150 hover:bg-surface disabled:pointer-events-none disabled:opacity-60 cursor-pointer";

export function TripPeople({
  tripId,
  people,
  addable,
  isCreator,
  currentUserId,
}: {
  tripId: string;
  people: Person[];
  addable: { id: string; name: string }[];
  isCreator: boolean;
  currentUserId: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(action: () => Promise<{ error?: string }>, after?: () => void) {
    if (pending) return;
    setPending(true);
    setError(null);
    const result = await action();
    setPending(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    after?.();
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <ul className="border-t border-line">
        {people.map((person) => (
          <li key={person.id} className="flex min-h-11 items-center justify-between gap-3 border-b border-line py-3">
            <div className="flex items-center gap-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-surface text-sm text-text">{person.initial}</span>
              <span className="text-base text-text">{person.id === currentUserId ? "Me" : person.name}</span>
            </div>
            {isCreator && person.id !== currentUserId && (
              <button type="button" disabled={pending} onClick={() => run(() => removeTripMemberAction(tripId, person.id))} className="min-h-11 px-2 text-sm text-muted hover:text-text cursor-pointer">Remove</button>
            )}
          </li>
        ))}
      </ul>

      {isCreator && addable.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm text-muted">Add friends</h3>
          <ul className="border-t border-line">
            {addable.map((friend) => (
              <li key={friend.id} className="flex min-h-11 items-center justify-between gap-3 border-b border-line py-3">
                <span className="text-base text-text">{friend.name}</span>
                <button type="button" disabled={pending} onClick={() => run(() => addTripMemberAction(tripId, friend.id))} className={buttonClass}>Add</button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {!isCreator && (
        <button type="button" disabled={pending} onClick={() => run(() => leaveTripAction(tripId), () => router.push("/trips"))} className={buttonClass}>Leave trip</button>
      )}

      {error && <p role="alert" className="text-sm text-text">{error}</p>}
    </div>
  );
}
