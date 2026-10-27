import type { ReactNode } from "react";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * A loading screen only draws the content area. The real chrome — the top bar
 * and the one tab bar — is already on screen because it lives in the root
 * shell, so a skeleton never draws a bar, an island or a header silhouette.
 * The bottom padding comes from --bar-h so nothing jumps when the page lands.
 */
export function AppShellSkeleton({
  children,
  label = "Loading",
}: {
  children: ReactNode;
  label?: string;
}) {
  return (
    <div
      className="mx-auto w-full max-w-[560px] px-4 pt-6"
      style={{ paddingBottom: "var(--bar-h)" }}
      aria-busy="true"
      aria-label={label}
    >
      <div className="space-y-6">{children}</div>
    </div>
  );
}

export function SkeletonTitle({ width = "w-32" }: { width?: string }) {
  return <Skeleton className={`h-7 ${width} rounded`} />;
}

export function SkeletonList({ rows = 4 }: { rows?: number }) {
  return (
    <div className="border-t border-line" aria-hidden="true">
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="space-y-2 border-b border-line py-4">
          <Skeleton className="h-4 w-2/3 rounded" />
          <Skeleton className="h-4 w-1/3 rounded" />
        </div>
      ))}
    </div>
  );
}
