"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { addTripMemberAction, leaveTripAction, removeTripMemberAction } from "@/app/actions/trip-members";
import { Avatar, Button } from "@/components/ui";

type Person = { id: string; name: string; initial: string };

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
          <li key={person.id} className="-mx-4 flex min-h-14 items-center justify-between gap-3 border-b border-line px-4 py-3">
            <div className="flex items-center gap-3">
              <Avatar size={32} initial={person.initial} name={person.name} />
              <span className="text-base font-semibold text-text">{person.id === currentUserId ? "Me" : person.name}</span>
            </div>
            {isCreator && person.id !== currentUserId && (
              <Button variant="destructive" size="sm" disabled={pending} onClick={() => run(() => removeTripMemberAction(tripId, person.id))}>Remove</Button>
            )}
          </li>
        ))}
      </ul>

      {isCreator && addable.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm text-muted">Add friends</h3>
          <ul className="border-t border-line">
            {addable.map((friend) => (
              <li key={friend.id} className="-mx-4 flex min-h-14 items-center justify-between gap-3 border-b border-line px-4 py-3">
                <span className="text-base font-semibold text-text">{friend.name}</span>
                <Button variant="secondary" size="sm" disabled={pending} onClick={() => run(() => addTripMemberAction(tripId, friend.id))}>Add</Button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {!isCreator && (
        <Button variant="destructive" disabled={pending} onClick={() => run(() => leaveTripAction(tripId), () => router.push("/trips"))}>Leave trip</Button>
      )}

      {error && <p role="alert" className="text-sm text-text">{error}</p>}
    </div>
  );
}
