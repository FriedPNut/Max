import {
  AppShellSkeleton,
  SkeletonList,
  SkeletonTitle,
} from "@/components/skeletons/app-shell-skeleton";

export default function FeedLoading() {
  return (
    <AppShellSkeleton label="Loading posts">
      <SkeletonTitle width="w-24" />
      <SkeletonList rows={3} />
    </AppShellSkeleton>
  );
}
