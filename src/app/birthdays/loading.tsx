import { Skeleton } from "@/components/ui/skeleton";
import {
  AppShellSkeleton,
  SkeletonList,
  SkeletonTitle,
} from "@/components/skeletons/app-shell-skeleton";

export default function BirthdaysLoading() {
  return (
    <AppShellSkeleton label="Loading birthdays">
      <div className="flex items-center gap-2">
        <Skeleton className="h-11 w-11 rounded-lg" />
        <SkeletonTitle width="w-36" />
      </div>
      <SkeletonList rows={3} />
    </AppShellSkeleton>
  );
}
