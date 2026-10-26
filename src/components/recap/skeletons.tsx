import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function RecapSkeleton() {
  return (
    <div className="space-y-8" aria-busy="true" aria-label="Loading your week">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-2">
          <Skeleton className="h-7 w-36 rounded" />
          <Skeleton className="h-4 w-28 rounded" />
        </div>
        <div className="flex gap-1" aria-hidden="true">
          <Skeleton className="h-11 w-11 rounded-lg" />
          <Skeleton className="h-11 w-11 rounded-lg" />
        </div>
      </div>

      <div className="border-t border-line" aria-hidden="true">
        {[0, 1, 2, 3, 4].map((index) => (
          <div key={index} className="flex items-center justify-between border-b border-line py-4">
            <Skeleton className="h-4 w-36 rounded" />
            <Skeleton className="h-4 w-8 rounded" />
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
        <Skeleton className="h-7 w-44 rounded" />
        <Skeleton className="h-4 w-24 rounded" />
      </div>

      <Card aria-hidden="true" className="flex min-h-[360px] flex-col justify-center p-6">
        <Skeleton className="h-4 w-20 rounded" />
        <Skeleton className="mt-4 h-9 w-2/3 rounded" />
        <Skeleton className="mt-3 h-4 w-1/3 rounded" />
      </Card>

      <div className="flex justify-center gap-2" aria-hidden="true">
        {[0, 1, 2].map((index) => (
          <Skeleton key={index} className="h-1.5 w-1.5 rounded-full" />
        ))}
      </div>
    </div>
  );
}
