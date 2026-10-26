import { AppShellSkeleton } from "@/components/skeletons/app-shell-skeleton";
import { BestOfResultSkeleton } from "@/components/best-of/skeletons";

export default function BestOfMonthLoading() {
  return (
    <AppShellSkeleton label="Loading best of">
      <BestOfResultSkeleton />
    </AppShellSkeleton>
  );
}
