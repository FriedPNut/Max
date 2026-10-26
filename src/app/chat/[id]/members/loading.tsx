import { Skeleton } from "@/components/ui/skeleton";
import {
  AppShellSkeleton,
  SkeletonList,
  SkeletonTitle,
} from "@/components/skeletons/app-shell-skeleton";

export default function GroupMembersLoading() {
  return (
    <AppShellSkeleton label="Loading members">
      <div className="flex items-center gap-2">
        <Skeleton className="h-11 w-11 rounded-lg" />
        <SkeletonTitle />
      </div>
      <SkeletonList rows={5} />
    </AppShellSkeleton>
  );
}
