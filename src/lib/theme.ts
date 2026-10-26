export type ThemeChoice = "system" | "light" | "dark";
export type ResolvedTheme = "light" | "dark";

export const THEME_STORAGE_KEY = "max-theme";

export const THEME_COLORS: Record<ResolvedTheme, string> = {
  light: "#F4F4F4",
  dark: "#000000",
};

export function readThemeChoice(): ThemeChoice {
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    return stored === "light" || stored === "dark" ? stored : "system";
  } catch {
    return "system";
  }
}

export function writeThemeChoice(choice: ThemeChoice) {
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, choice);
  } catch {
    // Storage can be unavailable; the choice still applies for this page.
  }
}

export function systemPrefersDark() {
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

export function resolveTheme(choice: ThemeChoice): ResolvedTheme {
  if (choice === "light" || choice === "dark") return choice;

  return systemPrefersDark() ? "dark" : "light";
}

export function applyTheme(choice: ThemeChoice) {
  const theme = resolveTheme(choice);
  const root = document.documentElement;

  // Don't let the 150ms color transitions animate the theme change itself.
  root.classList.add("theme-changing");
  root.dataset.theme = theme;
  root.style.colorScheme = theme;
  window.requestAnimationFrame(() => root.classList.remove("theme-changing"));

  // Media queries follow the system, so a manual choice updates both metas.
  document
    .querySelectorAll('meta[name="theme-color"]')
    .forEach((meta) => meta.setAttribute("content", THEME_COLORS[theme]));
}
