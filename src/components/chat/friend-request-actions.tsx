"use client";

import { useActionState } from "react";
import {
  acceptFriendRequestAction,
  declineFriendRequestAction,
  type ChatActionState,
} from "@/app/actions/chat";
import { Button } from "@/components/ui";

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
          <Button
            type="submit"
            size="sm"
            disabled={acceptPending || declinePending}
          >
            {acceptPending ? "Accepting..." : "Accept"}
          </Button>
        </form>

        <form action={declineAction}>
          <input type="hidden" name="friendship_id" value={friendshipId} />
          <Button
            type="submit"
            variant="secondary"
            size="sm"
            disabled={acceptPending || declinePending}
          >
            {declinePending ? "Declining..." : "Decline"}
          </Button>
        </form>
      </div>

      {error && (
        <p role="alert" className="max-w-[220px] text-right text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
