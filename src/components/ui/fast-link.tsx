"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ComponentProps } from "react";

/**
 * A Link that also warms the destination on press and hover. Next already
 * prefetches links in view; this makes the row you are about to tap win the
 * race even when it just entered the viewport.
 */
export function FastLink({
  href,
  onPointerDown,
  onMouseEnter,
  onTouchStart,
  ...props
}: ComponentProps<typeof Link>) {
  const router = useRouter();
  const target = typeof href === "string" ? href : null;

  function warm() {
    if (target) router.prefetch(target);
  }

  return (
    <Link
      {...props}
      href={href}
      onPointerDown={(event) => {
        warm();
        onPointerDown?.(event);
      }}
      onMouseEnter={(event) => {
        warm();
        onMouseEnter?.(event);
      }}
      onTouchStart={(event) => {
        warm();
        onTouchStart?.(event);
      }}
    />
  );
}
