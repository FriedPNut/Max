"use client";

import { useState } from "react";

export function ProfileAvatar({
  src,
  initial,
  size = 88,
}: {
  src: string | null;
  initial: string;
  size?: number;
}) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div
        className="flex shrink-0 items-center justify-center rounded-full border border-border bg-surface text-2xl font-medium text-text select-none"
        style={{ width: size, height: size }}
      >
        {initial}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt=""
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
      className="shrink-0 rounded-full border border-border bg-surface object-cover"
      style={{ width: size, height: size }}
    />
  );
}
