import { Skeleton } from "@/components/ui/skeleton";
import {
  AppShellSkeleton,
  SkeletonList,
  SkeletonTitle,
} from "@/components/skeletons/app-shell-skeleton";

export default function PeopleLoading() {
  return (
    <AppShellSkeleton label="Loading people">
      <SkeletonTitle />
      <Skeleton className="h-9 w-40 rounded-full" />
      <SkeletonList rows={6} />
    </AppShellSkeleton>
  );
}
