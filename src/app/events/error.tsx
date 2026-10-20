"use client";

import Link from "next/link";

export default function EventsError({ reset }: { reset: () => void }) {
  return (
    <div className="min-h-dvh bg-background text-text pb-24">
      <header className="sticky top-0 z-40 border-b border-line bg-background">
        <div className="mx-auto flex h-14 w-full max-w-[560px] items-center px-4">
          <Link href="/events" className="text-lg font-semibold text-text">
            Max
          </Link>
        </div>
      </header>

      <div className="mx-auto w-full max-w-[560px] space-y-4 px-4 pt-6">
        <h1 className="text-[28px] font-semibold leading-tight text-text">
          Something went wrong
        </h1>
        <p className="text-sm text-muted">
          The events didn&apos;t load. Try again.
        </p>

        <button
          type="button"
          onClick={reset}
          className="min-h-11 rounded-lg bg-text px-4 py-3 text-sm font-medium text-white transition-opacity duration-150 ease-out hover:opacity-90 cursor-pointer"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
