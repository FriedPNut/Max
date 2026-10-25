import {
  AppShellSkeleton,
  SkeletonTitle,
} from "@/components/skeletons/app-shell-skeleton";

export default function NewPostLoading() {
  return (
    <AppShellSkeleton label="Loading composer">
      <div className="flex items-center gap-2">
        <div className="h-11 w-11 rounded-lg bg-line/40" aria-hidden="true" />
        <SkeletonTitle width="w-24" />
      </div>
      <div className="space-y-4">
        <div className="h-56 w-full rounded-lg bg-line/40" aria-hidden="true" />
        <div className="h-11 w-full rounded-lg bg-line/50" aria-hidden="true" />
        <div className="h-11 w-32 rounded-lg bg-line/60" aria-hidden="true" />
      </div>
    </AppShellSkeleton>
  );
}
