import { Skeleton } from "@/components/ui/skeleton";
import { AppShellSkeleton } from "@/components/skeletons/app-shell-skeleton";

export default function ChatDetailsLoading() {
  return (
    <AppShellSkeleton label="Loading details">
      <div className="flex flex-col items-center gap-3 pt-1">
        <Skeleton className="h-24 w-24 rounded-full" />
        <Skeleton className="h-5 w-40 rounded" />
        <Skeleton className="h-4 w-24 rounded" />
      </div>

      <div className="overflow-hidden rounded-card bg-surface" aria-hidden="true">
        {[0, 1, 2, 3, 4].map((index) => (
          <div
            key={index}
            className="flex min-h-14 items-center justify-between gap-3 border-b border-line px-4 py-3 last:border-b-0"
          >
            <Skeleton className="h-4 w-40 rounded" />
            <Skeleton className="h-4 w-10 rounded" />
          </div>
        ))}
      </div>

      <div className="space-y-3" aria-hidden="true">
        <Skeleton className="h-5 w-24 rounded" />
        {[0, 1, 2].map((index) => (
          <div key={index} className="flex items-center gap-3">
            <Skeleton className="h-12 w-12 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-32 rounded" />
              <Skeleton className="h-3 w-24 rounded" />
            </div>
          </div>
        ))}
      </div>

      <div className="space-y-3" aria-hidden="true">
        <Skeleton className="h-4 w-24 rounded" />
        <Skeleton className="h-4 w-24 rounded" />
      </div>
    </AppShellSkeleton>
  );
}
