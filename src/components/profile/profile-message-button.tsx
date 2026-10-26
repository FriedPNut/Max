"use client";

import { useActionState } from "react";
import {
  startDmWithFriendAction,
  type ChatActionState,
} from "@/app/actions/chat";
import { Button } from "@/components/ui";

export function ProfileMessageButton({ friendId }: { friendId: string }) {
  const [state, formAction, pending] = useActionState(
    startDmWithFriendAction,
    {} as ChatActionState
  );

  return (
    <div className="min-w-0 flex-1">
      <form action={formAction}>
        <input type="hidden" name="friend_id" value={friendId} />
        <Button
          type="submit"
          variant="secondary"
          disabled={pending}
          className="w-full"
        >
          {pending ? "Opening..." : "Message"}
        </Button>
      </form>

      {state.error && (
        <p role="alert" className="mt-2 text-sm text-text">
          {state.error}
        </p>
      )}
    </div>
  );
}
