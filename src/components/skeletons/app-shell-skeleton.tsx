import type { ReactNode } from "react";

/**
 * The header and tab bar are static, so a navigation shows them (and a soft
 * gray skeleton) immediately instead of waiting on the page's data.
 */
export function AppShellSkeleton({
  children,
  label = "Loading",
}: {
  children: ReactNode;
  label?: string;
}) {
  return (
    <div className="min-h-dvh bg-background text-text pb-24">
      <header className="sticky top-0 z-40 border-b border-line bg-background">
        <div className="mx-auto flex h-14 w-full max-w-[560px] items-center justify-between px-4">
          <div className="h-5 w-12 rounded bg-line/60" aria-hidden="true" />
          <div className="h-9 w-9 rounded-lg bg-line/40" aria-hidden="true" />
        </div>
      </header>

      <div
        className="mx-auto w-full max-w-[560px] px-4 pt-6"
        aria-busy="true"
        aria-label={label}
      >
        <div className="animate-pulse space-y-6">{children}</div>
      </div>

      <div className="fixed bottom-0 inset-x-0 z-40 border-t border-line bg-surface">
        <div className="mx-auto w-full max-w-[560px] px-4">
          <div className="grid grid-cols-4">
            {[0, 1, 2, 3].map((index) => (
              <div
                key={index}
                className="flex min-h-[56px] flex-col items-center justify-center gap-1 py-1.5"
                aria-hidden="true"
              >
                <div className="h-6 w-6 rounded bg-line/40" />
                <div className="h-3 w-10 rounded bg-line/30" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function SkeletonTitle({ width = "w-32" }: { width?: string }) {
  return <div className={`h-7 ${width} rounded bg-line/60`} aria-hidden="true" />;
}

export function SkeletonList({ rows = 4 }: { rows?: number }) {
  return (
    <div className="border-t border-line" aria-hidden="true">
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="space-y-2 border-b border-line py-4">
          <div className="h-4 w-2/3 rounded bg-line/50" />
          <div className="h-4 w-1/3 rounded bg-line/40" />
        </div>
      ))}
    </div>
  );
}
