"use client";

import { useTheme } from "@/components/theme/theme-provider";
import { SegmentedControl } from "@/components/ui";
import type { ThemeChoice } from "@/lib/theme";

const OPTIONS: { value: ThemeChoice; label: string }[] = [
  { value: "system", label: "System" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
];

export function ThemeSwitcher() {
  const { choice, setChoice } = useTheme();

  return (
    <SegmentedControl
      label="Appearance"
      options={OPTIONS}
      value={choice}
      onChange={setChoice}
    />
  );
}
