import { AppShellSkeleton } from "@/components/skeletons/app-shell-skeleton";
import { Skeleton } from "@/components/ui/skeleton";

export default function EventsLoading() {
  return (
    <AppShellSkeleton label="Loading events">
      <section className="overflow-hidden rounded-card border border-line bg-surface">
        <div className="flex items-center justify-between px-4 py-3">
          <Skeleton className="h-5 w-16 rounded" />
          <Skeleton className="h-4 w-16 rounded" />
        </div>

        {[0, 1, 2].map((index) => (
          <div
            key={index}
            className="flex items-start justify-between gap-3 border-t border-line px-4 py-3"
          >
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-4 w-2/3 rounded" />
              <Skeleton className="h-4 w-1/2 rounded" />
            </div>
            <Skeleton className="h-9 w-12 rounded-lg" />
          </div>
        ))}
      </section>

      <section className="space-y-4">
        <div
          className="grid grid-cols-3 gap-1 rounded-full border border-line bg-surface p-1"
          aria-hidden="true"
        >
          {[0, 1, 2].map((index) => (
            <Skeleton key={index} className="h-11 rounded-full" />
          ))}
        </div>

        <div className="flex items-center gap-2" aria-hidden="true">
          <Skeleton className="h-6 flex-1 rounded" />
          <Skeleton className="h-11 w-16 rounded-lg" />
        </div>

        <div className="grid grid-cols-7 gap-1" aria-hidden="true">
          {Array.from({ length: 42 }, (_, index) => (
            <Skeleton key={index} className="h-11 rounded-lg" />
          ))}
        </div>
      </section>
    </AppShellSkeleton>
  );
}
