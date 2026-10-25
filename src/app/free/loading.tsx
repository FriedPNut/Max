import {
  AppShellSkeleton,
  SkeletonList,
  SkeletonTitle,
} from "@/components/skeletons/app-shell-skeleton";

export default function FreeLoading() {
  return (
    <AppShellSkeleton label="Loading availability">
      <div className="space-y-1">
        <div className="h-4 w-20 rounded bg-line/40" aria-hidden="true" />
        <SkeletonTitle width="w-40" />
      </div>
      <SkeletonList rows={3} />
    </AppShellSkeleton>
  );
}
