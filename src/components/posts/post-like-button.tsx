"use client";

import {
  forwardRef,
  useImperativeHandle,
  useState,
  useTransition,
} from "react";
import { togglePostLikeAction } from "@/app/actions/posts";
import {
  LikeButton,
  type LikeButtonHandle,
} from "@/components/ui/like-button";

/**
 * Post likes: optimistic toggle, rollback on failure, and the shared heart
 * animation. The ref lets a double-tapped photo like without unliking.
 */
export const PostLikeButton = forwardRef<
  LikeButtonHandle,
  {
    postId: string;
    initialLiked: boolean;
    initialCount: number;
    showCount?: boolean;
    onCountChange?: (count: number) => void;
  }
>(function PostLikeButton(
  {
    postId,
    initialLiked,
    initialCount,
    showCount = true,
    onCountChange,
  },
  ref
) {
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

    const nextCount = Math.max(0, previousCount + (nextLiked ? 1 : -1));

    setLiked(nextLiked);
    setCount(nextCount);
    onCountChange?.(nextCount);
    setError(null);

    startTransition(async () => {
      try {
        const result = await togglePostLikeAction(postId);

        if (result.error) {
          setLiked(previousLiked);
          setCount(previousCount);
          onCountChange?.(previousCount);
          setError(result.error);
        }
      } catch {
        setLiked(previousLiked);
        setCount(previousCount);
        onCountChange?.(previousCount);
        setError("Couldn't save that like. Try again.");
      }
    });
  }

  useImperativeHandle(
    ref,
    () => ({
      like() {
        if (!liked && !pending) {
          handleToggle();
        }
      },
    }),
    // handleToggle only reads these values.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [liked, pending]
  );

  return (
    <div>
      <LikeButton
        liked={liked}
        count={count}
        onToggle={handleToggle}
        showCount={showCount}
        label={`${liked ? "Unlike" : "Like"} post. ${count} ${
          count === 1 ? "like" : "likes"
        }.`}
      />

      {error && (
        <p role="alert" className="mt-1 text-sm text-text">
          {error}
        </p>
      )}
    </div>
  );
});
