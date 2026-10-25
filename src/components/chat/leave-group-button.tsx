"use client";

import { useActionState, useState } from "react";
import {
  leaveConversationAction,
  type ChatActionState,
} from "@/app/actions/chat";

export function LeaveGroupButton({
  conversationId,
}: {
  conversationId: string;
}) {
  const [state, formAction, pending] = useActionState(
    leaveConversationAction,
    {} as ChatActionState
  );
  const [confirming, setConfirming] = useState(false);

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="w-full min-h-11 rounded-lg border border-border bg-transparent px-4 py-3 text-sm font-medium text-text transition-colors duration-150 ease-out hover:bg-surface cursor-pointer"
      >
        Leave group
      </button>
    );
  }

  return (
    <form
      action={formAction}
      className="space-y-3 rounded-lg border border-border bg-surface p-4"
    >
      <input type="hidden" name="conversation_id" value={conversationId} />

      <p className="text-sm text-text">
        Leave this group? You&apos;ll stop getting its messages.
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
          className="min-h-11 rounded-lg bg-text px-4 py-3 text-sm font-medium text-background transition-opacity duration-150 ease-out hover:opacity-90 cursor-pointer disabled:opacity-60 disabled:pointer-events-none"
        >
          {pending ? "Leaving..." : "Leave group"}
        </button>

        <button
          type="button"
          onClick={() => setConfirming(false)}
          disabled={pending}
          className="min-h-11 rounded-lg border border-border bg-transparent px-4 py-3 text-sm font-medium text-text transition-colors duration-150 ease-out hover:bg-background cursor-pointer disabled:opacity-60 disabled:pointer-events-none"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
