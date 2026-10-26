import { Skeleton } from "@/components/ui/skeleton";
import {
  AppShellSkeleton,
  SkeletonTitle,
} from "@/components/skeletons/app-shell-skeleton";

export default function NewPostLoading() {
  return (
    <AppShellSkeleton noIsland label="Loading composer">
      <div className="flex items-center gap-2">
        <Skeleton className="h-11 w-11 rounded-lg" />
        <SkeletonTitle width="w-24" />
      </div>
      <div className="space-y-4">
        <Skeleton className="h-56 w-full rounded-lg" />
        <Skeleton className="h-11 w-full rounded-lg" />
        <Skeleton className="h-11 w-32 rounded-lg" />
      </div>
    </AppShellSkeleton>
  );
}
