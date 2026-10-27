import { Skeleton } from "@/components/ui/skeleton";
import { AppShellSkeleton } from "@/components/skeletons/app-shell-skeleton";

export default function WelcomeLoading() {
  return (
    <AppShellSkeleton label="Loading welcome">
      <div className="flex flex-col items-center py-6" aria-hidden="true">
        <Skeleton className="h-10 w-40 rounded" />
        <Skeleton className="mt-3 h-4 w-64 rounded" />
      </div>
      <Skeleton className="h-24 w-24 rounded-full" />
      <div className="space-y-4" aria-hidden="true">
        <Skeleton className="h-11 rounded-lg" />
        <Skeleton className="h-11 rounded-lg" />
      </div>
      <Skeleton className="h-11 rounded-lg" />
    </AppShellSkeleton>
  );
}
