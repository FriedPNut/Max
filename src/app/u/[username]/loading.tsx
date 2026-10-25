import {
  AppShellSkeleton,
  SkeletonList,
  SkeletonTitle,
} from "@/components/skeletons/app-shell-skeleton";

export default function PublicProfileLoading() {
  return (
    <AppShellSkeleton label="Loading profile">
      <div className="flex flex-col items-center gap-3">
        <div className="h-20 w-20 rounded-full bg-line/40" aria-hidden="true" />
        <SkeletonTitle width="w-40" />
        <div className="h-4 w-24 rounded bg-line/40" aria-hidden="true" />
      </div>

      <SkeletonList rows={4} />
    </AppShellSkeleton>
  );
}
