"use client";

import Link from "next/link";
import { useActionState } from "react";
import {
  startDmWithFriendAction,
  type ChatActionState,
} from "@/app/actions/chat";
import { ProfileAvatar } from "@/components/profile/profile-avatar";
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
        <ProfileAvatar src={friend.avatarUrl} initial={friend.initial} size={40} />
        <OnlineDot userId={friend.id} />
      </span>

      <span className="min-w-0 flex-1">
        <span className="block truncate text-base font-medium text-text">
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
      <div className="flex items-center gap-3 py-3">
        {friend.username ? (
          <Link
            href={`/u/${encodeURIComponent(friend.username)}`}
            className="flex min-w-0 flex-1 items-center gap-3 transition-opacity duration-150 ease-out hover:opacity-80"
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
          <button
            type="submit"
            disabled={pending}
            className="min-h-11 rounded-lg border border-border bg-transparent px-4 py-3 text-sm font-medium text-text transition-colors duration-150 ease-out hover:bg-surface cursor-pointer disabled:opacity-60 disabled:pointer-events-none"
          >
            {pending ? "Opening..." : "Message"}
          </button>
        </form>
      </div>

      {state.error && (
        <p role="alert" className="pb-3 text-sm text-text">
          {state.error}
        </p>
      )}
    </div>
  );
}
