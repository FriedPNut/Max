import { AppShellSkeleton } from "@/components/skeletons/app-shell-skeleton";
import { Skeleton } from "@/components/ui/skeleton";

export default function EventDetailLoading() {
  return (
    <AppShellSkeleton label="Loading event">
      <div className="space-y-3">
        <Skeleton className="h-4 w-20 rounded" />
        <Skeleton className="h-7 w-3/4 rounded" />
        <Skeleton className="h-4 w-32 rounded" />
      </div>

      <div className="border-t border-line" aria-hidden="true">
        {[0, 1, 2].map((index) => (
          <div key={index} className="space-y-2 border-b border-line py-4">
            <Skeleton className="h-4 w-16 rounded" />
            <Skeleton className="h-4 w-1/2 rounded" />
          </div>
        ))}
      </div>

      <div className="space-y-3" aria-hidden="true">
        <Skeleton className="h-5 w-24 rounded" />
        <div className="grid grid-cols-3 gap-2">
          {[0, 1, 2].map((index) => (
            <Skeleton key={index} className="h-11 rounded-lg" />
          ))}
        </div>
      </div>

      <div className="space-y-3" aria-hidden="true">
        <Skeleton className="h-5 w-36 rounded" />
        <Skeleton className="h-4 w-24 rounded" />
      </div>
    </AppShellSkeleton>
  );
}
