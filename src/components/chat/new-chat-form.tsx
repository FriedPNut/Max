"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import {
  createConversationAction,
  type ChatActionState,
} from "@/app/actions/chat";
import { Avatar } from "@/components/ui/avatar";
import { Button, Card, Input } from "@/components/ui";
import type { FriendListItem } from "@/lib/chat";

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
    <form action={formAction} className="space-y-5">
      <Card className="overflow-hidden">
        {friends.map((friend) => (
          <label
            key={friend.id}
            className="flex min-h-14 cursor-pointer items-center gap-3 border-b border-line px-4 py-3 last:border-b-0"
          >
            <Avatar
              src={friend.avatarUrl}
              initial={friend.initial}
              size={40}
            />

            <span className="min-w-0 flex-1">
              {friend.username ? (
                <Link
                  href={`/u/${encodeURIComponent(friend.username)}`}
                  className="block truncate text-[15px] font-semibold text-text transition-opacity duration-200 ease-out hover:opacity-70"
                  onClick={(event) => event.stopPropagation()}
                >
                  {friend.name}
                </Link>
              ) : (
                <span className="block truncate text-[15px] font-semibold text-text">
                  {friend.name}
                </span>
              )}
              {friend.username && (
                <span className="mt-0.5 block truncate text-sm text-muted">
                  @{friend.username}
                </span>
              )}
            </span>

            <input
              type="checkbox"
              name="friend_ids"
              value={friend.id}
              checked={selectedIds.includes(friend.id)}
              onChange={() => toggleFriend(friend.id)}
              className="ml-auto h-5 w-5 shrink-0 accent-primary"
            />
          </label>
        ))}
      </Card>

      {selectedCount >= 2 && (
        <Card className="space-y-3 p-4">
          <label
            htmlFor="group-name"
            className="block text-[13px] text-muted"
          >
            Group name
          </label>
          <Input
            id="group-name"
            name="name"
            type="text"
            required
            autoComplete="off"
            placeholder="Sunday crew"
          />
        </Card>
      )}

      {state.error && (
        <p role="alert" className="text-sm text-danger">
          {state.error}
        </p>
      )}

      <Button
        type="submit"
        disabled={pending || selectedCount === 0}
        className="w-full"
      >
        {pending
          ? "Starting..."
          : selectedCount >= 2
          ? "Create group"
          : "Start chat"}
      </Button>
    </form>
  );
}
