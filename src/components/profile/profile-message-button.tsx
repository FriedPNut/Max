"use client";

import { useActionState } from "react";
import {
  startDmWithFriendAction,
  type ChatActionState,
} from "@/app/actions/chat";

export function ProfileMessageButton({ friendId }: { friendId: string }) {
  const [state, formAction, pending] = useActionState(
    startDmWithFriendAction,
    {} as ChatActionState
  );

  return (
    <div>
      <form action={formAction}>
        <input type="hidden" name="friend_id" value={friendId} />
        <button
          type="submit"
          disabled={pending}
          className="w-full min-h-11 px-4 py-3 rounded-lg bg-text text-background font-sans font-medium text-sm transition-opacity duration-150 ease-out hover:opacity-90 cursor-pointer disabled:opacity-60 disabled:pointer-events-none"
        >
          {pending ? "Opening..." : "Message"}
        </button>
      </form>

      {state.error && (
        <p role="alert" className="mt-2 text-sm text-text">
          {state.error}
        </p>
      )}
    </div>
  );
}
