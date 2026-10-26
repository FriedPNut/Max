import { Skeleton } from "@/components/ui/skeleton";

export function BestOfSkeleton() {
  return (
    <div className="space-y-8" aria-busy="true" aria-label="Loading photo of the month">
      <div className="space-y-2">
        <Skeleton className="h-7 w-52 rounded" />
        <Skeleton className="h-4 w-40 rounded" />
      </div>

      <div className="grid grid-cols-2 gap-3" aria-hidden="true">
        {[0, 1, 2, 3].map((index) => (
          <div key={index} className="space-y-2">
            <Skeleton className="aspect-square w-full rounded-lg" />
            <Skeleton className="h-4 w-20 rounded" />
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
        <Skeleton className="h-7 w-52 rounded" />
        <Skeleton className="h-4 w-28 rounded" />
      </div>

      <Skeleton className="aspect-video w-full rounded-lg" />

      <div className="space-y-2" aria-hidden="true">
        <Skeleton className="h-5 w-28 rounded" />
        <Skeleton className="h-4 w-16 rounded" />
        <Skeleton className="h-4 w-3/4 rounded" />
      </div>
    </div>
  );
}
