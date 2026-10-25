import {
  AppShellSkeleton,
  SkeletonList,
  SkeletonTitle,
} from "@/components/skeletons/app-shell-skeleton";

export default function ListsLoading() {
  return (
    <AppShellSkeleton label="Loading lists">
      <SkeletonTitle />
      <SkeletonList rows={4} />
    </AppShellSkeleton>
  );
}
