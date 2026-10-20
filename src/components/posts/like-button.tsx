"use client";

import { Heart } from "lucide-react";
import { useState, useTransition } from "react";
import { togglePostLikeAction } from "@/app/actions/posts";

export function LikeButton({
  postId,
  initialLiked,
  initialCount,
}: {
  postId: string;
  initialLiked: boolean;
  initialCount: number;
}) {
  const [liked, setLiked] = useState(initialLiked);
  const [count, setCount] = useState(initialCount);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleToggle() {
    if (pending) {
      return;
    }

    const previousLiked = liked;
    const previousCount = count;
    const nextLiked = !previousLiked;

    setLiked(nextLiked);
    setCount(Math.max(0, previousCount + (nextLiked ? 1 : -1)));
    setError(null);

    startTransition(async () => {
      try {
        const result = await togglePostLikeAction(postId);

        if (result.error) {
          setLiked(previousLiked);
          setCount(previousCount);
          setError(result.error);
        }
      } catch {
        setLiked(previousLiked);
        setCount(previousCount);
        setError("Couldn't save that like. Try again.");
      }
    });
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleToggle}
        disabled={pending}
        aria-pressed={liked}
        aria-label={`${liked ? "Unlike" : "Like"} post. ${count} ${
          count === 1 ? "like" : "likes"
        }.`}
        className="inline-flex min-h-11 items-center gap-2 text-text transition-opacity duration-150 ease-out disabled:opacity-60 disabled:pointer-events-none cursor-pointer"
      >
        <Heart
          size={20}
          strokeWidth={1.5}
          fill={liked ? "currentColor" : "none"}
          aria-hidden="true"
        />
        <span className="text-sm text-muted">{count}</span>
      </button>

      {error && (
        <p role="alert" className="mt-1 text-sm text-text">
          {error}
        </p>
      )}
    </div>
  );
}
