import type { ReactNode } from "react";

/**
 * 56dp top bar with left, center and right slots (DESIGN.md §12). The
 * background is solid so content scrolling underneath never shows through.
 */
export function TopBar({
  left,
  center,
  right,
  divider = false,
}: {
  left?: ReactNode;
  center?: ReactNode;
  right?: ReactNode;
  divider?: boolean;
}) {
  return (
    <div className="bg-background">
      <div className="mx-auto grid h-14 w-full max-w-[560px] grid-cols-[1fr_auto_1fr] items-center gap-2 px-4">
        <div className="flex min-w-0 items-center justify-start">{left}</div>
        <div className="flex min-w-0 items-center justify-center">{center}</div>
        <div className="flex min-w-0 items-center justify-end gap-1">{right}</div>
      </div>
      {divider ? <div aria-hidden="true" className="h-px bg-line" /> : null}
    </div>
  );
}
