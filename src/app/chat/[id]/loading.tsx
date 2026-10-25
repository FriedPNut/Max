import {
  AppShellSkeleton,
  SkeletonList,
  SkeletonTitle,
} from "@/components/skeletons/app-shell-skeleton";

export default function ConversationLoading() {
  return (
    <AppShellSkeleton label="Loading messages">
      <div className="space-y-3">
        <div className="h-4 w-16 rounded bg-line/40" aria-hidden="true" />
        <SkeletonTitle width="w-40" />
      </div>
      <SkeletonList rows={5} />
    </AppShellSkeleton>
  );
}
