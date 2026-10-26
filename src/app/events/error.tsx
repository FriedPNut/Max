"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function EventsError({ reset }: { reset: () => void }) {
  return (
    <div className="min-h-dvh bg-background text-text pb-24">
      <header className="glass sticky top-0 z-40">
        <div className="mx-auto flex h-12 w-full max-w-[560px] items-center px-4">
          <Link
            href="/events"
            className="text-[24px] font-extrabold tracking-[-0.03em] text-text"
          >
            Max
          </Link>
        </div>
      </header>

      <div className="mx-auto w-full max-w-[560px] space-y-4 px-4 pt-6">
        <h1 className="text-[22px] font-bold leading-tight text-text">
          Something went wrong
        </h1>
        <p className="text-sm text-muted">
          The events didn&apos;t load. Try again.
        </p>

        <Button onClick={reset}>Try again</Button>
      </div>
    </div>
  );
}
