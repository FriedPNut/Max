"use client";

import Link from "next/link";
import { useActionState } from "react";
import {
  startDmWithFriendAction,
  type ChatActionState,
} from "@/app/actions/chat";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui";
import { OnlineDot } from "@/components/presence-provider";
import type { FriendListItem } from "@/lib/chat";

export function StartChatButton({ friend }: { friend: FriendListItem }) {
  const [state, formAction, pending] = useActionState(
    startDmWithFriendAction,
    {} as ChatActionState
  );

  const identity = (
    <>
      <span className="relative block shrink-0">
        <Avatar src={friend.avatarUrl} initial={friend.initial} size={40} />
        <OnlineDot userId={friend.id} />
      </span>

      <span className="min-w-0 flex-1">
        <span className="block truncate text-[15px] font-semibold text-text">
          {friend.name}
        </span>
        {friend.username && (
          <span className="mt-0.5 block truncate text-sm text-muted">
            @{friend.username}
          </span>
        )}
      </span>
    </>
  );

  return (
    <div className="border-b border-line">
      <div className="flex min-h-14 items-center gap-3 py-3">
        {friend.username ? (
          <Link
            href={`/u/${encodeURIComponent(friend.username)}`}
            className="flex min-w-0 flex-1 items-center gap-3 transition-opacity duration-200 ease-out hover:opacity-80"
          >
            {identity}
          </Link>
        ) : (
          <div className="flex min-w-0 flex-1 items-center gap-3">
            {identity}
          </div>
        )}

        <form action={formAction} className="shrink-0">
          <input type="hidden" name="friend_id" value={friend.id} />
          <Button type="submit" variant="secondary" size="sm" disabled={pending}>
            {pending ? "Opening..." : "Message"}
          </Button>
        </form>
      </div>

      {state.error && (
        <p role="alert" className="pb-3 text-sm text-danger">
          {state.error}
        </p>
      )}
    </div>
  );
}
