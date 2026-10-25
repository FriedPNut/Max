import {
  AppShellSkeleton,
  SkeletonTitle,
} from "@/components/skeletons/app-shell-skeleton";

export default function PostDetailLoading() {
  return (
    <AppShellSkeleton label="Loading post">
      <div className="flex items-center gap-2">
        <div className="h-11 w-11 rounded-lg bg-line/40" aria-hidden="true" />
        <SkeletonTitle width="w-20" />
      </div>
      <div className="space-y-4">
        <div className="h-72 w-full rounded-lg bg-line/40" aria-hidden="true" />
        <div className="h-4 w-2/3 rounded bg-line/50" aria-hidden="true" />
        <div className="h-4 w-1/3 rounded bg-line/40" aria-hidden="true" />
      </div>
      <div className="space-y-3 border-t border-line pt-4">
        {[0, 1, 2].map((index) => (
          <div
            key={index}
            className="h-4 w-1/2 rounded bg-line/40"
            aria-hidden="true"
          />
        ))}
      </div>
    </AppShellSkeleton>
  );
}
