"use client";

import { Heart } from "lucide-react";
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
} from "react";

export type LikeButtonHandle = {
  /** Likes without ever unliking, for double-tapping a photo. */
  like: () => void;
};

// Same keyframes, curves and timings as the .heart-pop and .count-fade rules in
// globals.css, so replaying them from an effect looks exactly like the CSS did.
const EASE_OUT = "cubic-bezier(0.22, 1, 0.36, 1)";
const EASE_SPRING = "cubic-bezier(0.32, 0.72, 0, 1)";

const HEART_POP = [
  { transform: "scale(1)" },
  { transform: "scale(1.3)", offset: 0.3 },
  { transform: "scale(1)" },
];

const COUNT_FADE = [{ opacity: 0.2 }, { opacity: 1 }];

function motionAllowed() {
  return !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Replays one of the animations above on an already-rendered node. The element
 * is never re-keyed or remounted: keys were doing the retriggering before, and
 * the heart and the count are siblings, so their small integer keys collided.
 */
function replay(
  node: Element | null,
  keyframes: Keyframe[],
  duration: number,
  easing: string
) {
  if (!node || typeof node.animate !== "function" || !motionAllowed()) {
    return;
  }

  node.animate(keyframes, { duration, easing });
}

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
  const previousCount = useRef(count);
  const heartRef = useRef<SVGSVGElement | null>(null);
  const countRef = useRef<HTMLSpanElement | null>(null);

  // The heart pops when this person likes something, never on first render.
  useEffect(() => {
    const wasLiked = previousLiked.current;
    previousLiked.current = liked;

    if (liked && !wasLiked) {
      replay(heartRef.current, HEART_POP, 300, EASE_SPRING);
    }
  }, [liked]);

  // One count node, faded in place whenever the number changes.
  useEffect(() => {
    if (previousCount.current === count) {
      return;
    }

    previousCount.current = count;
    replay(countRef.current, COUNT_FADE, 150, EASE_OUT);
  }, [count]);

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
      ref={heartRef}
      size={variant === "chip" ? 18 : 24}
      strokeWidth={1.75}
      fill={liked ? "currentColor" : "none"}
      aria-hidden="true"
      className="heart-icon"
    />
  );

  const countNode = showCount ? (
    <span
      ref={countRef}
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
