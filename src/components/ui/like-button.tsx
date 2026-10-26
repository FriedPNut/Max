"use client";

import { Heart } from "lucide-react";
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";

export type LikeButtonHandle = {
  /** Likes without ever unliking, for double-tapping a photo. */
  like: () => void;
};

/**
 * Shared like control used by posts, idea votes and list votes. The owner
 * keeps the truth; this handles the press, the heart pop on a new like, the
 * quiet fade on unlike and the count's quick fade.
 */
export const LikeButton = forwardRef<
  LikeButtonHandle,
  {
    liked: boolean;
    count: number;
    onToggle: () => void;
    label: string;
    variant?: "icon" | "chip";
    disabled?: boolean;
    showCount?: boolean;
    className?: string;
  }
>(function LikeButton(
  {
    liked,
    count,
    onToggle,
    label,
    variant = "icon",
    disabled = false,
    showCount = true,
    className = "",
  },
  ref
) {
  const previousLiked = useRef(liked);
  const [popping, setPopping] = useState(false);
  const [popKey, setPopKey] = useState(0);

  useEffect(() => {
    const wasLiked = previousLiked.current;
    previousLiked.current = liked;

    if (liked && !wasLiked) {
      setPopping(true);
      setPopKey((current) => current + 1);
      const timer = window.setTimeout(() => setPopping(false), 320);
      return () => window.clearTimeout(timer);
    }

    if (!liked) {
      setPopping(false);
    }
  }, [liked]);

  useImperativeHandle(
    ref,
    () => ({
      like() {
        if (!liked && !disabled) {
          onToggle();
        }
      },
    }),
    [disabled, liked, onToggle]
  );

  const heart = (
    <Heart
      key={popKey}
      size={variant === "chip" ? 18 : 24}
      strokeWidth={1.75}
      fill={liked ? "currentColor" : "none"}
      aria-hidden="true"
      className={`heart-icon ${popping ? "heart-pop" : ""}`}
    />
  );

  const countNode = showCount ? (
    <span
      key={count}
      className={`count-fade text-sm ${liked ? "text-danger" : "text-muted"}`}
    >
      {count}
    </span>
  ) : null;

  if (variant === "chip") {
    return (
      <button
        type="button"
        onClick={onToggle}
        disabled={disabled}
        aria-pressed={liked}
        aria-label={label}
        className={`inline-flex min-h-11 min-w-[64px] shrink-0 items-center justify-center gap-1.5 rounded-full bg-surface-2 px-3 text-sm font-semibold transition-[background-color,color,opacity,scale] duration-100 ease-out active:opacity-90 disabled:pointer-events-none disabled:opacity-40 ${
          liked ? "text-danger" : "text-text"
        } ${className}`}
      >
        {heart}
        {countNode}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={disabled}
      aria-pressed={liked}
      aria-label={label}
      className={`inline-flex min-h-11 items-center gap-2 transition-opacity duration-200 ease-out disabled:pointer-events-none disabled:opacity-60 ${
        liked ? "text-danger" : "text-text"
      } ${className}`}
    >
      {heart}
      {countNode}
    </button>
  );
});
