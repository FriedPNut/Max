import { Skeleton } from "@/components/ui/skeleton";
import {
  AppShellSkeleton,
  SkeletonList,
  SkeletonTitle,
} from "@/components/skeletons/app-shell-skeleton";

export default function HangLoading() {
  return (
    <AppShellSkeleton label="Loading hangs">
      <div className="space-y-1">
        <Skeleton className="h-4 w-20 rounded" />
        <SkeletonTitle width="w-44" />
      </div>
      <Skeleton className="h-11 w-full rounded-lg" />
      <SkeletonList rows={3} />
    </AppShellSkeleton>
  );
}
