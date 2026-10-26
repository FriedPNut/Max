"use client";

import { useState } from "react";
import { toggleIdeaVoteAction } from "@/app/actions/ideas";
import { LikeButton } from "@/components/ui/like-button";

export function IdeaVoteButton({
  ideaId,
  title,
  count,
  hasVoted,
  disabled = false,
  onChange,
}: {
  ideaId: string;
  title: string;
  count: number;
  hasVoted: boolean;
  disabled?: boolean;
  onChange?: (next: { voteCount: number; hasVoted: boolean }) => void;
}) {
  const [voted, setVoted] = useState(hasVoted);
  const [value, setValue] = useState(count);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function apply(nextVoted: boolean, nextCount: number) {
    setVoted(nextVoted);
    setValue(nextCount);
    onChange?.({ voteCount: nextCount, hasVoted: nextVoted });
  }

  async function handleClick() {
    if (pending || disabled) {
      return;
    }

    const previousVoted = voted;
    const previousCount = value;
    const nextVoted = !previousVoted;
    const nextCount = Math.max(0, previousCount + (nextVoted ? 1 : -1));

    apply(nextVoted, nextCount);
    setError(null);
    setPending(true);

    try {
      const result = await toggleIdeaVoteAction(ideaId);

      if (result.error) {
        apply(previousVoted, previousCount);
        setError(result.error);
        return;
      }

      if (typeof result.voted === "boolean" && result.voted !== nextVoted) {
        apply(
          result.voted,
          Math.max(0, previousCount + (result.voted ? 1 : -1))
        );
      }
    } catch {
      apply(previousVoted, previousCount);
      setError("Couldn't save your vote. Try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex shrink-0 flex-col items-end gap-1">
      <LikeButton
        variant="chip"
        liked={voted}
        count={value}
        disabled={pending || disabled}
        onToggle={() => void handleClick()}
        label={
          voted
            ? `Remove upvote for ${title}, ${value} ${
                value === 1 ? "vote" : "votes"
              }`
            : `Upvote ${title}, ${value} ${value === 1 ? "vote" : "votes"}`
        }
      />

      {error && (
        <p role="alert" className="max-w-[180px] text-right text-sm text-text">
          {error}
        </p>
      )}
    </div>
  );
}
