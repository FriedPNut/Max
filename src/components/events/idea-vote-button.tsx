"use client";

import { useState } from "react";
import { toggleIdeaVoteAction } from "@/app/actions/ideas";

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
    const nextCount = Math.max(
      0,
      previousCount + (nextVoted ? 1 : -1)
    );

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
      <button
        type="button"
        onClick={handleClick}
        disabled={pending || disabled}
        aria-pressed={voted}
        aria-label={
          voted
            ? `Remove upvote for ${title}, ${value} ${value === 1 ? "vote" : "votes"}`
            : `Upvote ${title}, ${value} ${value === 1 ? "vote" : "votes"}`
        }
        className={`inline-flex min-h-11 min-w-[76px] items-center justify-center rounded-lg border px-3 text-sm font-medium transition-colors duration-150 ease-out cursor-pointer disabled:opacity-60 disabled:pointer-events-none ${
          voted
            ? "border-text text-text"
            : "border-border text-muted hover:text-text"
        }`}
      >
        Upvote {value}
      </button>

      {error && (
        <p role="alert" className="max-w-[180px] text-right text-sm text-text">
          {error}
        </p>
      )}
    </div>
  );
}
