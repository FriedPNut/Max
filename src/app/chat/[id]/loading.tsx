import { Skeleton } from "@/components/ui/skeleton";
import {
  AppShellSkeleton,
  SkeletonList,
  SkeletonTitle,
} from "@/components/skeletons/app-shell-skeleton";

export default function ConversationLoading() {
  return (
    <AppShellSkeleton noIsland label="Loading messages">
      <div className="space-y-3">
        <Skeleton className="h-4 w-16 rounded" />
        <SkeletonTitle width="w-40" />
      </div>
      <SkeletonList rows={5} />
    </AppShellSkeleton>
  );
}
