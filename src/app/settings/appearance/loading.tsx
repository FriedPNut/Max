import { Skeleton } from "@/components/ui/skeleton";
import {
  AppShellSkeleton,
  SkeletonTitle,
} from "@/components/skeletons/app-shell-skeleton";

export default function AppearanceLoading() {
  return (
    <AppShellSkeleton label="Loading appearance">
      <Skeleton className="h-11 w-11 rounded-full" />
      <SkeletonTitle />
      <div className="space-y-2" aria-hidden="true">
        {[0, 1, 2].map((index) => (
          <Skeleton key={index} className="h-14 rounded-card" />
        ))}
      </div>
    </AppShellSkeleton>
  );
}
