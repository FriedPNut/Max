import { Skeleton } from "@/components/ui/skeleton";
import {
  AppShellSkeleton,
  SkeletonList,
  SkeletonTitle,
} from "@/components/skeletons/app-shell-skeleton";

export default function ListDetailLoading() {
  return (
    <AppShellSkeleton label="Loading list">
      <div className="flex items-center gap-2">
        <Skeleton className="h-11 w-11 rounded-lg" />
        <SkeletonTitle width="w-40" />
      </div>
      <div className="flex gap-2" aria-hidden="true">
        <Skeleton className="h-11 flex-1 rounded-lg" />
        <Skeleton className="h-11 flex-1 rounded-lg" />
      </div>
      <SkeletonList rows={4} />
    </AppShellSkeleton>
  );
}
