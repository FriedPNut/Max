import { Skeleton } from "@/components/ui/skeleton";
import {
  AppShellSkeleton,
  SkeletonList,
  SkeletonTitle,
} from "@/components/skeletons/app-shell-skeleton";

export default function PublicProfileLoading() {
  return (
    <AppShellSkeleton label="Loading profile">
      <div className="flex flex-col items-center gap-3">
        <Skeleton className="h-20 w-20 rounded-full" />
        <SkeletonTitle width="w-40" />
        <Skeleton className="h-4 w-24 rounded" />
      </div>

      <SkeletonList rows={4} />
    </AppShellSkeleton>
  );
}
