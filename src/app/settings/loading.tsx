import { Skeleton } from "@/components/ui/skeleton";
import {
  AppShellSkeleton,
  SkeletonTitle,
} from "@/components/skeletons/app-shell-skeleton";

export default function SettingsLoading() {
  return (
    <AppShellSkeleton label="Loading settings">
      <Skeleton className="h-11 w-11 rounded-full" />
      <SkeletonTitle />
      <div className="overflow-hidden rounded-card bg-surface" aria-hidden="true">
        {[0, 1, 2, 3].map((index) => (
          <div
            key={index}
            className="flex min-h-14 items-center gap-3 border-b border-line px-4 py-3 last:border-b-0"
          >
            <Skeleton className="h-6 w-6 rounded" />
            <Skeleton className="h-4 w-32 rounded" />
          </div>
        ))}
      </div>
    </AppShellSkeleton>
  );
}
