"use client";

import Link from "next/link";
import { useActionState } from "react";
import {
  addConversationMemberAction,
  type ChatActionState,
} from "@/app/actions/chat";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui";
import type { FriendListItem } from "@/lib/chat";

export function AddMemberButton({
  conversationId,
  friend,
}: {
  conversationId: string;
  friend: FriendListItem;
}) {
  const [state, formAction, pending] = useActionState(
    addConversationMemberAction,
    {} as ChatActionState
  );

  return (
    <div className="flex min-h-14 items-center gap-3 border-b border-line py-3">
      {friend.username ? (
        <Link
          href={`/u/${encodeURIComponent(friend.username)}`}
          aria-label={`View ${friend.name}'s profile`}
          className="shrink-0 transition-opacity duration-200 ease-out hover:opacity-80"
        >
          <Avatar
            src={friend.avatarUrl}
            initial={friend.initial}
            size={40}
          />
        </Link>
      ) : (
        <Avatar
          src={friend.avatarUrl}
          initial={friend.initial}
          size={40}
        />
      )}

      <div className="min-w-0 flex-1">
        {friend.username ? (
          <Link
            href={`/u/${encodeURIComponent(friend.username)}`}
            className="block truncate text-[15px] font-semibold text-text transition-opacity duration-200 ease-out hover:opacity-70"
          >
            {friend.name}
          </Link>
        ) : (
          <p className="truncate text-[15px] font-semibold text-text">
            {friend.name}
          </p>
        )}
        {friend.username && (
          <p className="mt-0.5 truncate text-sm text-muted">
            @{friend.username}
          </p>
        )}
      </div>

      <div className="flex shrink-0 flex-col items-end gap-1">
        <form action={formAction}>
          <input
            type="hidden"
            name="conversation_id"
            value={conversationId}
          />
          <input type="hidden" name="friend_id" value={friend.id} />
          <Button
            type="submit"
            size="sm"
            disabled={pending || state.success}
          >
            {state.success ? "Added" : pending ? "Adding..." : "Add"}
          </Button>
        </form>

        {state.error && (
          <p
            role="alert"
            className="max-w-[180px] text-right text-sm text-danger"
          >
            {state.error}
          </p>
        )}
      </div>
    </div>
  );
}
