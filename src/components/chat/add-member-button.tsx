"use client";

import Link from "next/link";
import { useActionState } from "react";
import {
  addConversationMemberAction,
  type ChatActionState,
} from "@/app/actions/chat";
import { ProfileAvatar } from "@/components/profile/profile-avatar";
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
    <div className="flex items-center gap-3 border-b border-line py-3">
      {friend.username ? (
        <Link
          href={`/u/${encodeURIComponent(friend.username)}`}
          aria-label={`View ${friend.name}'s profile`}
          className="shrink-0 transition-opacity duration-150 ease-out hover:opacity-80"
        >
          <ProfileAvatar
            src={friend.avatarUrl}
            initial={friend.initial}
            size={40}
          />
        </Link>
      ) : (
        <ProfileAvatar
          src={friend.avatarUrl}
          initial={friend.initial}
          size={40}
        />
      )}

      <div className="min-w-0 flex-1">
        {friend.username ? (
          <Link
            href={`/u/${encodeURIComponent(friend.username)}`}
            className="block truncate text-base font-medium text-text transition-opacity duration-150 ease-out hover:opacity-80"
          >
            {friend.name}
          </Link>
        ) : (
          <p className="truncate text-base font-medium text-text">
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
          <button
            type="submit"
            disabled={pending || state.success}
            className="min-h-11 rounded-lg border border-border bg-transparent px-4 py-3 text-sm font-medium text-text transition-colors duration-150 ease-out hover:bg-surface cursor-pointer disabled:opacity-60 disabled:pointer-events-none"
          >
            {state.success ? "Added" : pending ? "Adding..." : "Add"}
          </button>
        </form>

        {state.error && (
          <p
            role="alert"
            className="max-w-[180px] text-right text-sm text-text"
          >
            {state.error}
          </p>
        )}
      </div>
    </div>
  );
}
