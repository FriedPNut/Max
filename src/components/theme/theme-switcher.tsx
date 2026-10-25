"use client";

import { useTheme } from "@/components/theme/theme-provider";
import type { ThemeChoice } from "@/lib/theme";

const OPTIONS: { value: ThemeChoice; label: string }[] = [
  { value: "system", label: "System" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
];

export function ThemeSwitcher() {
  const { choice, setChoice } = useTheme();

  return (
    <div
      role="group"
      aria-label="Appearance"
      className="grid grid-cols-3 gap-1 rounded-lg border border-border bg-surface p-1"
    >
      {OPTIONS.map((option) => {
        const isActive = choice === option.value;

        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={isActive}
            onClick={() => setChoice(option.value)}
            className={`min-h-11 rounded-lg px-3 text-sm transition-colors duration-150 ease-out cursor-pointer ${
              isActive
                ? "bg-text text-background font-medium"
                : "text-muted hover:text-text"
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
