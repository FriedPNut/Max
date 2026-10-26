import { Skeleton } from "@/components/ui/skeleton";
import {
  AppShellSkeleton,
  SkeletonList,
} from "@/components/skeletons/app-shell-skeleton";

export default function MeLoading() {
  return (
    <AppShellSkeleton label="Loading profile">
      <div className="flex items-center gap-4" aria-hidden="true">
        <Skeleton className="h-16 w-16 rounded-full" />
        <Skeleton className="h-7 w-40 rounded" />
      </div>
      <div className="grid grid-cols-2 gap-2" aria-hidden="true">
        <Skeleton className="h-11 rounded" />
        <Skeleton className="h-11 rounded" />
      </div>
      <SkeletonList rows={4} />
    </AppShellSkeleton>
  );
}
