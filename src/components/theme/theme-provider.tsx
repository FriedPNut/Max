"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  applyTheme,
  readThemeChoice,
  writeThemeChoice,
  type ThemeChoice,
} from "@/lib/theme";

type ThemeContextValue = {
  choice: ThemeChoice;
  setChoice: (next: ThemeChoice) => void;
};

const ThemeContext = createContext<ThemeContextValue>({
  choice: "system",
  setChoice: () => {},
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [choice, setChoiceState] = useState<ThemeChoice>("system");

  useEffect(() => {
    const stored = readThemeChoice();
    setChoiceState(stored);
    // The inline script already set the attribute before paint; this also
    // syncs the theme-color metas.
    applyTheme(stored);

    const query = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      if (readThemeChoice() === "system") applyTheme("system");
    };

    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  const setChoice = useCallback((next: ThemeChoice) => {
    writeThemeChoice(next);
    setChoiceState(next);
    applyTheme(next);
  }, []);

  return (
    <ThemeContext.Provider value={{ choice, setChoice }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
