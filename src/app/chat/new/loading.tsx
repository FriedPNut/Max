import { Skeleton } from "@/components/ui/skeleton";
import {
  AppShellSkeleton,
  SkeletonList,
  SkeletonTitle,
} from "@/components/skeletons/app-shell-skeleton";

export default function NewChatLoading() {
  return (
    <AppShellSkeleton noIsland label="Loading new chat">
      <div className="flex items-center gap-2">
        <Skeleton className="h-11 w-11 rounded-lg" />
        <SkeletonTitle />
      </div>
      <SkeletonList rows={5} />
    </AppShellSkeleton>
  );
}
