import type { ReactNode } from "react";

export function Badge({
  count,
  dot = false,
  label,
  className = "",
  children,
}: {
  count?: number;
  dot?: boolean;
  label?: string;
  className?: string;
  children?: ReactNode;
}) {
  if (dot || count === undefined) {
    return (
      <span
        aria-label={label}
        aria-hidden={label ? undefined : true}
        className={`badge-pop block min-h-2 min-w-2 rounded-full bg-danger ${className}`}
      />
    );
  }

  return (
    <span
      key={count}
      aria-label={label}
      className={`badge-pop inline-flex min-h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-xs font-semibold leading-none text-on-primary ${className}`}
    >
      {count > 99 ? "99+" : count}
      {children}
    </span>
  );
}
