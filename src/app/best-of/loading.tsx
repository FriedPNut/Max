import { AppShellSkeleton } from "@/components/skeletons/app-shell-skeleton";
import { BestOfSkeleton } from "@/components/best-of/skeletons";

export default function BestOfLoading() {
  return (
    <AppShellSkeleton label="Loading best of">
      <BestOfSkeleton />
    </AppShellSkeleton>
  );
}
