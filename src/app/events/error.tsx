"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { TopBar } from "@/components/shell/top-bar";

export default function EventsError({ reset }: { reset: () => void }) {
  return (
    <div className="min-h-dvh bg-background text-text pb-24">
      <header className="glass sticky top-0 z-40">
        <TopBar
          center={
            <Link
              href="/events"
              className="text-[26px] font-extrabold leading-none tracking-[-0.03em] text-text"
            >
              Max
            </Link>
          }
        />
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
