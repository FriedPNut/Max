import {
  AppShellSkeleton,
  SkeletonList,
  SkeletonTitle,
} from "@/components/skeletons/app-shell-skeleton";

export default function ChatLoading() {
  return (
    <AppShellSkeleton label="Loading chat">
      <SkeletonTitle />
      <div className="h-11 rounded-lg border border-line bg-surface" aria-hidden="true" />
      <SkeletonList rows={5} />
    </AppShellSkeleton>
  );
}
