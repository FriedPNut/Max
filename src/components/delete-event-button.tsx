"use client";

import { useActionState, useState } from "react";
import {
  deleteEventAction,
  type DeleteEventState,
} from "@/app/actions/events";

export function DeleteEventButton({ eventId }: { eventId: string }) {
  const [state, formAction, pending] = useActionState(
    deleteEventAction,
    {} as DeleteEventState
  );
  const [confirming, setConfirming] = useState(false);

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="min-h-11 px-4 py-3 rounded-lg border border-line bg-transparent text-text font-sans font-medium text-sm transition-colors duration-150 ease-out hover:bg-surface cursor-pointer"
      >
        Delete
      </button>
    );
  }

  return (
    <form
      action={formAction}
      className="w-full space-y-3 rounded-lg border border-line bg-surface p-4"
    >
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
        <button
          type="submit"
          disabled={pending}
          className="min-h-11 px-4 py-3 rounded-lg bg-text text-white font-sans font-medium text-sm transition-opacity duration-150 ease-out hover:opacity-90 cursor-pointer disabled:opacity-60 disabled:pointer-events-none"
        >
          {pending ? "Deleting..." : "Delete"}
        </button>

        <button
          type="button"
          onClick={() => setConfirming(false)}
          className="min-h-11 px-4 py-3 rounded-lg border border-line bg-transparent text-text font-sans font-medium text-sm transition-colors duration-150 ease-out hover:bg-background cursor-pointer"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
