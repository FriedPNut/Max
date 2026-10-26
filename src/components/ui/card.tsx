import type { HTMLAttributes, ReactNode } from "react";

export function Card({
  className = "",
  children,
  ...props
}: HTMLAttributes<HTMLDivElement> & { children?: ReactNode }) {
  return (
    <div
      {...props}
      className={`rounded-card border border-line bg-surface ${className}`}
    >
      {children}
    </div>
  );
}
