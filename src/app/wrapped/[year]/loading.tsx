import { AppShellSkeleton } from "@/components/skeletons/app-shell-skeleton";
import { WrappedSkeleton } from "@/components/recap/skeletons";

export default function WrappedLoading() {
  return (
    <AppShellSkeleton label="Loading wrapped">
      <WrappedSkeleton />
    </AppShellSkeleton>
  );
}
