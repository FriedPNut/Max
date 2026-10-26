export function Divider({ className = "" }: { className?: string }) {
  return (
    <div
      role="presentation"
      className={`h-px w-full shrink-0 bg-line ${className}`}
    />
  );
}
