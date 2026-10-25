"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { useEffect, useState } from "react";
import { bestOfBannerFor, type BestOfBanner as Banner } from "@/lib/best-of";

export function BestOfBanner() {
  const [banner, setBanner] = useState<Banner | null>(null);

  // Computed after mount so server and client markup match.
  useEffect(() => {
    setBanner(bestOfBannerFor(new Date()));
  }, []);

  if (!banner) {
    return null;
  }

  return (
    <Link
      href={banner.href}
      className="flex min-h-11 items-center justify-between gap-3 rounded-lg border border-border bg-surface px-4 py-2 text-sm text-text transition-colors duration-150 ease-out hover:bg-background"
    >
      <span className="min-w-0 truncate">{banner.label}</span>
      <ChevronRight
        size={20}
        strokeWidth={1.5}
        aria-hidden="true"
        className="shrink-0 text-muted"
      />
    </Link>
  );
}
