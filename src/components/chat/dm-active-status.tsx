"use client";

import { usePresence } from "@/components/presence-provider";

export function DmActiveStatus({ userId }: { userId: string | null }) {
  const online = usePresence();

  if (!userId || !online.has(userId)) {
    return null;
  }

  return <p className="mt-0.5 truncate text-xs text-muted">Active now</p>;
}
