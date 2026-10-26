import type { ButtonHTMLAttributes, ReactNode } from "react";

export function Chip({
  selected = false,
  className = "",
  children,
  type = "button",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  selected?: boolean;
  children?: ReactNode;
}) {
  return (
    <button
      {...props}
      type={type}
      aria-pressed={selected}
      className={`inline-flex shrink-0 items-center justify-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-semibold transition-[background-color,color,opacity,scale] duration-100 ease-out active:opacity-90 ${
        selected ? "bg-text text-background" : "bg-surface-2 text-text"
      } ${className}`}
    >
      {children}
    </button>
  );
}
