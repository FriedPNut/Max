import {
  AppShellSkeleton,
  SkeletonList,
  SkeletonTitle,
} from "@/components/skeletons/app-shell-skeleton";

export default function BirthdaysLoading() {
  return (
    <AppShellSkeleton label="Loading birthdays">
      <div className="flex items-center gap-2">
        <div className="h-11 w-11 rounded-lg bg-line/40" aria-hidden="true" />
        <SkeletonTitle width="w-36" />
      </div>
      <SkeletonList rows={3} />
    </AppShellSkeleton>
  );
}
