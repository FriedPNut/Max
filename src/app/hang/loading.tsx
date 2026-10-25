import {
  AppShellSkeleton,
  SkeletonList,
  SkeletonTitle,
} from "@/components/skeletons/app-shell-skeleton";

export default function HangLoading() {
  return (
    <AppShellSkeleton label="Loading hangs">
      <div className="space-y-1">
        <div className="h-4 w-20 rounded bg-line/40" aria-hidden="true" />
        <SkeletonTitle width="w-44" />
      </div>
      <div className="h-11 w-full rounded-lg bg-line/60" aria-hidden="true" />
      <SkeletonList rows={3} />
    </AppShellSkeleton>
  );
}
