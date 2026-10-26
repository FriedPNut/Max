import { Skeleton } from "@/components/ui/skeleton";
import {
  AppShellSkeleton,
  SkeletonList,
  SkeletonTitle,
} from "@/components/skeletons/app-shell-skeleton";

export default function NotificationsLoading() {
  return (
    <AppShellSkeleton label="Loading notifications">
      <div className="space-y-1">
        <Skeleton className="h-4 w-20 rounded" />
        <SkeletonTitle width="w-48" />
      </div>
      <SkeletonList rows={3} />
    </AppShellSkeleton>
  );
}
