export function BestOfSkeleton() {
  return (
    <div className="space-y-8" aria-busy="true" aria-label="Loading photo of the month">
      <div className="space-y-2">
        <div className="h-7 w-52 rounded bg-line/60" aria-hidden="true" />
        <div className="h-4 w-40 rounded bg-line/40" aria-hidden="true" />
      </div>

      <div className="grid grid-cols-2 gap-3" aria-hidden="true">
        {[0, 1, 2, 3].map((index) => (
          <div key={index} className="space-y-2">
            <div className="aspect-square w-full rounded-lg bg-line/40" />
            <div className="h-4 w-20 rounded bg-line/40" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function BestOfResultSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading results">
      <div className="space-y-2">
        <div className="h-7 w-52 rounded bg-line/60" aria-hidden="true" />
        <div className="h-4 w-28 rounded bg-line/40" aria-hidden="true" />
      </div>

      <div className="aspect-video w-full rounded-lg bg-line/40" aria-hidden="true" />

      <div className="space-y-2" aria-hidden="true">
        <div className="h-5 w-28 rounded bg-line/50" />
        <div className="h-4 w-16 rounded bg-line/40" />
        <div className="h-4 w-3/4 rounded bg-line/40" />
      </div>
    </div>
  );
}
