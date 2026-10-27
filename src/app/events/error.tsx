"use client";

import { Button } from "@/components/ui/button";

export default function EventsError({ reset }: { reset: () => void }) {
  return (
    <div className="mx-auto w-full max-w-[560px] space-y-4 px-4 pt-6">
      <h1 className="text-[20px] font-bold leading-tight text-text">
        Something went wrong
      </h1>
      <p className="text-sm text-muted">
        The events didn&apos;t load. Try again.
      </p>

      <Button onClick={reset}>Try again</Button>
    </div>
  );
}
