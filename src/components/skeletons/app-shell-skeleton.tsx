import type { ReactNode } from "react";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * The chrome is static, so a navigation shows it (and a soft gray skeleton)
 * immediately instead of waiting on the page's data.
 */
export function AppShellSkeleton({
  children,
  label = "Loading",
  noIsland = false,
}: {
  children: ReactNode;
  label?: string;
  noIsland?: boolean;
}) {
  return (
    <div className="h-dvh w-full overflow-hidden bg-background text-text">
      <div className="h-full w-full overflow-x-hidden overflow-y-auto overscroll-contain">
        <header
          className="glass sticky top-0 z-40"
          style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
        >
          <div className="mx-auto flex h-14 w-full max-w-[560px] items-center justify-between gap-2 px-4">
            <Skeleton className="h-6 w-14 rounded" />
            <Skeleton className="h-6 w-6 rounded-full" />
          </div>
          <div aria-hidden="true" className="h-px bg-line opacity-0" />
        </header>

        <div
          className="mx-auto w-full max-w-[560px] px-4 pt-6"
          style={{
            paddingBottom:
              "calc(60px + 12px + env(safe-area-inset-bottom, 0px))",
          }}
          aria-busy="true"
          aria-label={label}
        >
          <div className="space-y-6">{children}</div>
        </div>
      </div>

      {!noIsland && (
        <div
          aria-hidden="true"
          className="glass fixed left-1/2 z-40 rounded-full border border-line shadow-pop"
          style={{
            bottom: "calc(env(safe-area-inset-bottom, 0px) + 12px)",
            width: "min(calc(100% - 32px), 420px)",
            height: 60,
            transform: "translateX(-50%)",
          }}
        >
          <div className="grid h-full grid-cols-4">
            {[0, 1, 2, 3].map((index) => (
              <div
                key={index}
                className="flex items-center justify-center"
              >
                <Skeleton className="h-6 w-6 rounded-full" />
              </div>
            ))}
          </div>
        </div>
      )}
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
