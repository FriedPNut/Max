"use client";

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  label,
  className = "",
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (next: T) => void;
  label: string;
  className?: string;
}) {
  const activeIndex = Math.max(
    0,
    options.findIndex((option) => option.value === value)
  );

  return (
    <div
      role="tablist"
      aria-label={label}
      className={`relative flex rounded-full bg-surface-2 p-1 ${className}`}
    >
      <span
        aria-hidden="true"
        className="shadow-control absolute inset-y-1 left-1 rounded-full bg-surface transition-transform duration-200 ease-out"
        style={{
          width: `calc((100% - 0.5rem) / ${options.length})`,
          transform: `translateX(${activeIndex * 100}%)`,
        }}
      />

      {options.map((option) => {
        const isActive = option.value === value;

        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(option.value)}
            className={`relative z-10 min-h-9 flex-1 rounded-full px-3 text-sm font-semibold transition-colors duration-200 ease-out ${
              isActive ? "text-text" : "text-muted"
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
