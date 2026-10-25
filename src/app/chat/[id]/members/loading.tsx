import {
  AppShellSkeleton,
  SkeletonList,
  SkeletonTitle,
} from "@/components/skeletons/app-shell-skeleton";

export default function GroupMembersLoading() {
  return (
    <AppShellSkeleton label="Loading members">
      <div className="flex items-center gap-2">
        <div className="h-11 w-11 rounded-lg bg-line/40" aria-hidden="true" />
        <SkeletonTitle />
      </div>
      <SkeletonList rows={5} />
    </AppShellSkeleton>
  );
}
