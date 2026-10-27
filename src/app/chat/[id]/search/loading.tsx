import { Skeleton } from "@/components/ui/skeleton";
import { AppShellSkeleton } from "@/components/skeletons/app-shell-skeleton";

export default function ChatSearchLoading() {
  return (
    <AppShellSkeleton label="Loading search">
      <Skeleton className="h-11 w-full rounded-full" />

      <div className="border-y border-line" aria-hidden="true">
        {[0, 1, 2, 3, 4, 5].map((index) => (
          <div key={index} className="space-y-2 border-b border-line py-3 last:border-b-0">
            <div className="flex items-center justify-between gap-3">
              <Skeleton className="h-3.5 w-24 rounded" />
              <Skeleton className="h-3 w-16 rounded" />
            </div>
            <Skeleton className="h-4 w-3/4 rounded" />
          </div>
        ))}
      </div>
    </AppShellSkeleton>
  );
}
