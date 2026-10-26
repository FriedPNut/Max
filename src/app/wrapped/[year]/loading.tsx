import { AppShellSkeleton } from "@/components/skeletons/app-shell-skeleton";
import { WrappedSkeleton } from "@/components/recap/skeletons";

export default function WrappedLoading() {
  return (
    <AppShellSkeleton noIsland label="Loading wrapped">
      <WrappedSkeleton />
    </AppShellSkeleton>
  );
}
