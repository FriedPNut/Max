"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { bestOfBannerFor } from "@/lib/best-of";
import { useToday } from "@/lib/use-today";

export function BestOfBanner() {
  // After mount so server and client markup match, and re-read each local day.
  const today = useToday();
  const banner = today ? bestOfBannerFor(today) : null;

  if (!banner) {
    return null;
  }

  return (
    <Link
      href={banner.href}
      className="press-row flex min-h-14 items-center justify-between gap-3 rounded-card border border-line bg-surface px-4 py-2 text-base font-semibold text-text transition-colors duration-200 ease-out hover:bg-surface-2"
    >
      <span className="min-w-0 truncate">{banner.label}</span>
      <ChevronRight
        size={24}
        strokeWidth={1.75}
        aria-hidden="true"
        className="shrink-0 text-muted"
      />
    </Link>
  );
}
