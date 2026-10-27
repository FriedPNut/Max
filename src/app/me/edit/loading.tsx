import { Skeleton } from "@/components/ui/skeleton";
import {
  AppShellSkeleton,
  SkeletonTitle,
} from "@/components/skeletons/app-shell-skeleton";

export default function EditProfileLoading() {
  return (
    <AppShellSkeleton label="Loading profile editor">
      <SkeletonTitle />
      <div className="flex flex-col items-center" aria-hidden="true">
        <Skeleton className="h-24 w-24 rounded-full" />
        <Skeleton className="mt-4 h-4 w-24 rounded" />
      </div>
      <div className="space-y-4" aria-hidden="true">
        {[0, 1, 2].map((index) => (
          <div key={index} className="space-y-2">
            <Skeleton className="h-3 w-20 rounded" />
            <Skeleton className="h-11 rounded-lg" />
          </div>
        ))}
      </div>
    </AppShellSkeleton>
  );
}
