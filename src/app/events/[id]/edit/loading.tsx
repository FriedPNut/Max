import {
  AppShellSkeleton,
  SkeletonTitle,
} from "@/components/skeletons/app-shell-skeleton";

export default function EditEventLoading() {
  return (
    <AppShellSkeleton label="Loading event form">
      <div className="flex items-center gap-2">
        <div className="h-11 w-11 rounded-lg bg-line/40" aria-hidden="true" />
        <SkeletonTitle />
      </div>

      <div className="space-y-3">
        {[0, 1, 2, 3].map((index) => (
          <div
            key={index}
            className="h-12 rounded-lg bg-line/40"
            aria-hidden="true"
          />
        ))}
        <div className="h-11 rounded-lg bg-line/50" aria-hidden="true" />
      </div>
    </AppShellSkeleton>
  );
}
