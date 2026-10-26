import type { ComponentPropsWithRef } from "react";

const fieldBase =
  "w-full border border-border bg-surface-2 px-3.5 py-3 text-base leading-snug text-text placeholder:text-muted outline-none transition-colors duration-200 focus:border-primary focus:outline-2 focus:outline-offset-0 focus:outline-primary disabled:opacity-60";

/** Shared field classes, for `<select>` and any field not using the components. */
export const inputClass = `${fieldBase} rounded-lg`;

export function Input({
  pill = false,
  className = "",
  ...props
}: ComponentPropsWithRef<"input"> & { pill?: boolean }) {
  return (
    <input
      {...props}
      className={`${fieldBase} ${pill ? "rounded-full" : "rounded-lg"} ${className}`.trim()}
    />
  );
}

export function Textarea({
  className = "",
  ...props
}: ComponentPropsWithRef<"textarea">) {
  return (
    <textarea
      {...props}
      className={`${fieldBase} rounded-lg ${className}`.trim()}
    />
  );
}
