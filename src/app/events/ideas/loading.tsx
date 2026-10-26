import { AppShellSkeleton } from "@/components/skeletons/app-shell-skeleton";
import { Skeleton } from "@/components/ui/skeleton";

export default function IdeasLoading() {
  return (
    <AppShellSkeleton label="Loading ideas">
      <div className="flex items-center gap-2" aria-hidden="true">
        <Skeleton className="h-11 w-11 rounded-lg" />
        <Skeleton className="h-7 w-20 rounded" />
      </div>

      <div
        className="grid grid-cols-2 gap-1 rounded-full border border-line bg-surface p-1"
        aria-hidden="true"
      >
        {[0, 1].map((index) => (
          <Skeleton key={index} className="h-11 rounded-full" />
        ))}
      </div>

      <div className="border-t border-line" aria-hidden="true">
        {[0, 1, 2, 3].map((index) => (
          <div
            key={index}
            className="flex items-start justify-between gap-3 border-b border-line py-4"
          >
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-4 w-2/3 rounded" />
              <Skeleton className="h-4 w-1/3 rounded" />
            </div>
            <Skeleton className="h-11 w-14 rounded-lg" />
          </div>
        ))}
      </div>
    </AppShellSkeleton>
  );
}
