import {
  AppShellSkeleton,
  SkeletonList,
  SkeletonTitle,
} from "@/components/skeletons/app-shell-skeleton";

export default function ListDetailLoading() {
  return (
    <AppShellSkeleton label="Loading list">
      <div className="flex items-center gap-2">
        <div className="h-11 w-11 rounded-lg bg-line/40" aria-hidden="true" />
        <SkeletonTitle width="w-40" />
      </div>
      <div className="flex gap-2" aria-hidden="true">
        <div className="h-11 flex-1 rounded-lg bg-line/40" />
        <div className="h-11 flex-1 rounded-lg bg-line/40" />
      </div>
      <SkeletonList rows={4} />
    </AppShellSkeleton>
  );
}
