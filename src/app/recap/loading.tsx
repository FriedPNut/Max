import { AppShellSkeleton } from "@/components/skeletons/app-shell-skeleton";
import { RecapSkeleton } from "@/components/recap/skeletons";

export default function RecapLoading() {
  return (
    <AppShellSkeleton label="Loading recap">
      <RecapSkeleton />
    </AppShellSkeleton>
  );
}
