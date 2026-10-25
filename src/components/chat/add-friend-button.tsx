"use client";

import { useActionState } from "react";
import {
  sendFriendRequestAction,
  type ChatActionState,
} from "@/app/actions/chat";

export function AddFriendButton({ userId }: { userId: string }) {
  const [state, formAction, pending] = useActionState(
    sendFriendRequestAction,
    {} as ChatActionState
  );

  return (
    <div className="flex flex-col items-end gap-1">
      <form action={formAction}>
        <input type="hidden" name="addressee_id" value={userId} />
        <button
          type="submit"
          disabled={pending || state.success}
          className="min-h-11 px-4 py-3 rounded-lg border border-border bg-transparent text-text font-sans font-medium text-sm transition-colors duration-150 ease-out hover:bg-surface cursor-pointer disabled:opacity-60 disabled:pointer-events-none"
        >
          {state.success ? "Request sent" : pending ? "Adding..." : "Add"}
        </button>
      </form>

      {state.error && (
        <p role="alert" className="max-w-[180px] text-right text-sm text-text">
          {state.error}
        </p>
      )}
    </div>
  );
}
