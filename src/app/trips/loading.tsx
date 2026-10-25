import {
  AppShellSkeleton,
  SkeletonList,
  SkeletonTitle,
} from "@/components/skeletons/app-shell-skeleton";

export default function TripsLoading() {
  return (
    <AppShellSkeleton label="Loading trips">
      <SkeletonTitle />
      <SkeletonList rows={4} />
    </AppShellSkeleton>
  );
}
