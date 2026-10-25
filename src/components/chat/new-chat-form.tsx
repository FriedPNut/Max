"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import {
  createConversationAction,
  type ChatActionState,
} from "@/app/actions/chat";
import { ProfileAvatar } from "@/components/profile/profile-avatar";
import type { FriendListItem } from "@/lib/chat";

const inputClass =
  "w-full bg-surface text-text placeholder:text-muted border border-border rounded-lg px-3 py-3 text-base leading-snug focus:outline-2 focus:outline-offset-0 focus:outline-text";

export function NewChatForm({ friends }: { friends: FriendListItem[] }) {
  const [state, formAction, pending] = useActionState(
    createConversationAction,
    {} as ChatActionState
  );
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const selectedCount = selectedIds.length;

  function toggleFriend(friendId: string) {
    setSelectedIds((current) =>
      current.includes(friendId)
        ? current.filter((id) => id !== friendId)
        : [...current, friendId]
    );
  }

  return (
    <form action={formAction} className="space-y-6">
      <div className="border-t border-line">
        {friends.map((friend) => (
          <label
            key={friend.id}
            className="flex cursor-pointer items-center gap-3 border-b border-line py-3"
          >
            <input
              type="checkbox"
              name="friend_ids"
              value={friend.id}
              checked={selectedIds.includes(friend.id)}
              onChange={() => toggleFriend(friend.id)}
              className="h-4 w-4 accent-text"
            />

            <ProfileAvatar
              src={friend.avatarUrl}
              initial={friend.initial}
              size={40}
            />

            <span className="min-w-0">
              {friend.username ? (
                <Link
                  href={`/u/${encodeURIComponent(friend.username)}`}
                  className="block truncate text-base font-medium text-text transition-opacity duration-150 ease-out hover:opacity-80"
                  onClick={(event) => event.stopPropagation()}
                >
                  {friend.name}
                </Link>
              ) : (
                <span className="block truncate text-base font-medium text-text">
                  {friend.name}
                </span>
              )}
              {friend.username && (
                <span className="mt-0.5 block truncate text-sm text-muted">
                  @{friend.username}
                </span>
              )}
            </span>
          </label>
        ))}
      </div>

      {selectedCount >= 2 && (
        <div>
          <label
            htmlFor="group-name"
            className="block text-sm text-muted mb-2"
          >
            Group name
          </label>
          <input
            id="group-name"
            name="name"
            type="text"
            required
            autoComplete="off"
            placeholder="Sunday crew"
            className={inputClass}
          />
        </div>
      )}

      {state.error && (
        <div
          role="alert"
          className="rounded-lg border border-border bg-surface px-3.5 py-3 text-sm text-text"
        >
          {state.error}
        </div>
      )}

      <button
        type="submit"
        disabled={pending || selectedCount === 0}
        className="w-full min-h-11 px-4 py-3 rounded-lg bg-text text-background font-sans font-medium text-sm transition-opacity duration-150 ease-out hover:opacity-90 cursor-pointer disabled:opacity-60 disabled:pointer-events-none"
      >
        {pending
          ? "Starting..."
          : selectedCount >= 2
          ? "Create group"
          : "Start chat"}
      </button>
    </form>
  );
}
