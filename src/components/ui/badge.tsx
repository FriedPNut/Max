"use client";

import { useEffect, useRef, type ReactNode } from "react";

// Mirrors @keyframes badge-pop in globals.css.
const EASE_SPRING = "cubic-bezier(0.32, 0.72, 0, 1)";
const BADGE_POP = [
  { opacity: 0, transform: "scale(0.6)" },
  { transform: "scale(1.08)", offset: 0.7 },
  { opacity: 1, transform: "scale(1)" },
];

export function Badge({
  count,
  dot = false,
  label,
  className = "",
  children,
}: {
  count?: number;
  dot?: boolean;
  label?: string;
  className?: string;
  children?: ReactNode;
}) {
  const nodeRef = useRef<HTMLSpanElement | null>(null);
  const previousCount = useRef(count);

  // A changed count pops in place. The count used to be the node's key, which
  // remounted it to replay the animation and could collide with a sibling.
  useEffect(() => {
    if (previousCount.current === count) {
      return;
    }

    previousCount.current = count;

    const node = nodeRef.current;

    if (
      !node ||
      count === undefined ||
      typeof node.animate !== "function" ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }

    node.animate(BADGE_POP, { duration: 220, easing: EASE_SPRING });
  }, [count]);

  if (dot || count === undefined) {
    return (
      <span
        aria-label={label}
        aria-hidden={label ? undefined : true}
        className={`badge-pop block min-h-2 min-w-2 rounded-full bg-danger ${className}`}
      />
    );
  }

  return (
    <span
      ref={nodeRef}
      aria-label={label}
      className={`badge-pop inline-flex min-h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-xs font-semibold leading-none text-on-primary ${className}`}
    >
      {count > 99 ? "99+" : count}
      {children}
    </span>
  );
}
