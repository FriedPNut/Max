import { Skeleton } from "@/components/ui/skeleton";
import {
  AppShellSkeleton,
  SkeletonTitle,
} from "@/components/skeletons/app-shell-skeleton";

export default function PostDetailLoading() {
  return (
    <AppShellSkeleton label="Loading post">
      <div className="flex items-center gap-2">
        <Skeleton className="h-11 w-11 rounded-lg" />
        <SkeletonTitle width="w-20" />
      </div>
      <div className="space-y-4">
        <Skeleton className="h-72 w-full rounded-lg" />
        <Skeleton className="h-4 w-2/3 rounded" />
        <Skeleton className="h-4 w-1/3 rounded" />
      </div>
      <div className="space-y-3 border-t border-line pt-4">
        {[0, 1, 2].map((index) => (
          <Skeleton key={index} className="h-4 w-1/2 rounded" />
        ))}
      </div>
    </AppShellSkeleton>
  );
}
