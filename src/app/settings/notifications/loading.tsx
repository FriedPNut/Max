import { Skeleton } from "@/components/ui/skeleton";
import {
  AppShellSkeleton,
  SkeletonTitle,
} from "@/components/skeletons/app-shell-skeleton";

export default function NotificationSettingsLoading() {
  return (
    <AppShellSkeleton label="Loading notification settings">
      <div className="space-y-1">
        <Skeleton className="h-4 w-20 rounded" />
        <SkeletonTitle width="w-52" />
      </div>
      <div aria-hidden="true">
        {[0, 1, 2, 3, 4].map((index) => (
          <div
            key={index}
            className="flex items-center justify-between gap-4 border-b border-line py-4"
          >
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-4 w-40 rounded" />
              <Skeleton className="h-4 w-56 rounded" />
            </div>
            <Skeleton className="h-[31px] w-[51px] shrink-0 rounded-full" />
          </div>
        ))}
      </div>
    </AppShellSkeleton>
  );
}
