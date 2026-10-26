import { Skeleton } from "@/components/ui/skeleton";
import {
  AppShellSkeleton,
  SkeletonTitle,
} from "@/components/skeletons/app-shell-skeleton";

export default function NewEventLoading() {
  return (
    <AppShellSkeleton noIsland label="Loading event form">
      <div className="flex items-center gap-2">
        <Skeleton className="h-11 w-11 rounded-lg" />
        <SkeletonTitle />
      </div>

      <div className="space-y-3">
        {[0, 1, 2, 3].map((index) => (
          <Skeleton key={index} className="h-12 rounded-lg" />
        ))}
        <Skeleton className="h-11 rounded-lg" />
      </div>
    </AppShellSkeleton>
  );
}
