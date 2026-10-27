/** A 10dp primary dot marking unread messages (DESIGN.md §12). */
export function UnreadDot({
  label,
  className = "",
}: {
  label?: string;
  className?: string;
}) {
  return (
    <span
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className={`block h-2.5 w-2.5 shrink-0 rounded-full bg-primary ${className}`}
    />
  );
}
