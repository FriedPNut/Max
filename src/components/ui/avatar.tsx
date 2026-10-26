"use client";

import { useState } from "react";

export type AvatarSize = 24 | 32 | 40 | 56 | 88;

const SIZES: Record<AvatarSize, { box: string; text: string }> = {
  24: { box: "h-6 w-6", text: "text-[10px]" },
  32: { box: "h-8 w-8", text: "text-xs" },
  40: { box: "h-10 w-10", text: "text-sm" },
  56: { box: "h-14 w-14", text: "text-lg" },
  88: { box: "h-[88px] w-[88px]", text: "text-2xl" },
};

export function Avatar({
  src,
  name,
  initial,
  size = 40,
  className = "",
}: {
  src?: string | null;
  name?: string;
  initial?: string;
  size?: AvatarSize;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const sizeClass = SIZES[size];
  const letter =
    initial?.trim().charAt(0).toUpperCase() ||
    name?.trim().charAt(0).toUpperCase() ||
    "M";

  if (!src || failed) {
    return (
      <span
        aria-hidden="true"
        className={`flex shrink-0 select-none items-center justify-center rounded-full bg-surface-2 font-semibold text-text ${sizeClass.box} ${sizeClass.text} ${className}`}
      >
        {letter}
      </span>
    );
  }

  return (
    <img
      draggable={false}
      src={src}
      alt={name ? `${name}` : ""}
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
      className={`shrink-0 rounded-full bg-surface-2 object-cover ${sizeClass.box} ${className}`}
    />
  );
}
