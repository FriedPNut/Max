import {
  AppShellSkeleton,
  SkeletonList,
} from "@/components/skeletons/app-shell-skeleton";

export default function MeLoading() {
  return (
    <AppShellSkeleton label="Loading profile">
      <div className="flex items-center gap-4" aria-hidden="true">
        <div className="h-16 w-16 rounded-full bg-line/50" />
        <div className="h-7 w-40 rounded bg-line/60" />
      </div>
      <div className="grid grid-cols-2 gap-2" aria-hidden="true">
        <div className="h-11 rounded bg-line/40" />
        <div className="h-11 rounded bg-line/40" />
      </div>
      <SkeletonList rows={4} />
    </AppShellSkeleton>
  );
}
