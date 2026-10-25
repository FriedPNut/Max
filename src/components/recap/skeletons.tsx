export function RecapSkeleton() {
  return (
    <div className="space-y-8" aria-busy="true" aria-label="Loading your week">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-2">
          <div className="h-7 w-36 rounded bg-line/60" aria-hidden="true" />
          <div className="h-4 w-28 rounded bg-line/40" aria-hidden="true" />
        </div>
        <div className="flex gap-1" aria-hidden="true">
          <div className="h-11 w-11 rounded-lg bg-line/40" />
          <div className="h-11 w-11 rounded-lg bg-line/40" />
        </div>
      </div>

      <div className="border-t border-line" aria-hidden="true">
        {[0, 1, 2, 3, 4].map((index) => (
          <div key={index} className="flex items-center justify-between border-b border-line py-4">
            <div className="h-4 w-36 rounded bg-line/50" />
            <div className="h-4 w-8 rounded bg-line/40" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function WrappedSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading Max Wrapped">
      <div className="space-y-2">
        <div className="h-7 w-44 rounded bg-line/60" aria-hidden="true" />
        <div className="h-4 w-24 rounded bg-line/40" aria-hidden="true" />
      </div>

      <div
        className="flex min-h-[360px] flex-col justify-center rounded-lg border border-border bg-surface p-6"
        aria-hidden="true"
      >
        <div className="h-4 w-20 rounded bg-line/40" />
        <div className="mt-4 h-9 w-2/3 rounded bg-line/60" />
        <div className="mt-3 h-4 w-1/3 rounded bg-line/40" />
      </div>

      <div className="flex justify-center gap-2" aria-hidden="true">
        {[0, 1, 2].map((index) => (
          <div key={index} className="h-1.5 w-1.5 rounded-full bg-line" />
        ))}
      </div>
    </div>
  );
}
