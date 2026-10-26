"use client";

import { useActionState } from "react";
import {
  sendFriendRequestAction,
  type ChatActionState,
} from "@/app/actions/chat";
import { Button } from "@/components/ui";

export function AddFriendButton({ userId }: { userId: string }) {
  const [state, formAction, pending] = useActionState(
    sendFriendRequestAction,
    {} as ChatActionState
  );

  return (
    <div className="flex flex-col items-end gap-1">
      <form action={formAction}>
        <input type="hidden" name="addressee_id" value={userId} />
        <Button
          type="submit"
          disabled={pending || state.success}
        >
          {state.success ? "Request sent" : pending ? "Adding..." : "Add"}
        </Button>
      </form>

      {state.error && (
        <p role="alert" className="max-w-[180px] text-right text-sm text-danger">
          {state.error}
        </p>
      )}
    </div>
  );
}
