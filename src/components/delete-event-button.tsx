"use client";

import { useActionState, useState } from "react";
import {
  deleteEventAction,
  type DeleteEventState,
} from "@/app/actions/events";
import { Button, Card } from "@/components/ui";

export function DeleteEventButton({ eventId }: { eventId: string }) {
  const [state, formAction, pending] = useActionState(
    deleteEventAction,
    {} as DeleteEventState
  );
  const [confirming, setConfirming] = useState(false);

  if (!confirming) {
    return (
      <Button variant="destructive" onClick={() => setConfirming(true)}>
        Delete
      </Button>
    );
  }

  return (
    <form action={formAction}>
      <Card className="w-full space-y-3 p-4">
        <input type="hidden" name="event_id" value={eventId} />

        <p className="text-sm text-text">
          Delete this event? It can&apos;t be undone.
        </p>

        {state.error && (
          <p role="alert" className="text-sm text-text">
            {state.error}
          </p>
        )}

        <div className="flex flex-wrap gap-2">
          <Button type="submit" variant="destructive" disabled={pending}>
            {pending ? "Deleting..." : "Delete"}
          </Button>

          <Button
            type="button"
            variant="secondary"
            onClick={() => setConfirming(false)}
          >
            Cancel
          </Button>
        </div>
      </Card>
    </form>
  );
}
