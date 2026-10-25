"use client";

import { useActionState } from "react";
import {
  acceptFriendRequestAction,
  declineFriendRequestAction,
  type ChatActionState,
} from "@/app/actions/chat";

export function FriendRequestActions({
  friendshipId,
}: {
  friendshipId: string;
}) {
  const [acceptState, acceptAction, acceptPending] = useActionState(
    acceptFriendRequestAction,
    {} as ChatActionState
  );
  const [declineState, declineAction, declinePending] = useActionState(
    declineFriendRequestAction,
    {} as ChatActionState
  );

  const error = acceptState.error ?? declineState.error;

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-2">
        <form action={acceptAction}>
          <input type="hidden" name="friendship_id" value={friendshipId} />
          <button
            type="submit"
            disabled={acceptPending || declinePending}
            className="min-h-11 px-3 py-2.5 rounded-lg bg-text text-background font-sans font-medium text-sm transition-opacity duration-150 ease-out hover:opacity-90 cursor-pointer disabled:opacity-60 disabled:pointer-events-none"
          >
            {acceptPending ? "Accepting..." : "Accept"}
          </button>
        </form>

        <form action={declineAction}>
          <input type="hidden" name="friendship_id" value={friendshipId} />
          <button
            type="submit"
            disabled={acceptPending || declinePending}
            className="min-h-11 px-3 py-2.5 rounded-lg border border-border bg-transparent text-text font-sans font-medium text-sm transition-colors duration-150 ease-out hover:bg-surface cursor-pointer disabled:opacity-60 disabled:pointer-events-none"
          >
            {declinePending ? "Declining..." : "Decline"}
          </button>
        </form>
      </div>

      {error && (
        <p role="alert" className="max-w-[220px] text-right text-sm text-text">
          {error}
        </p>
      )}
    </div>
  );
}
