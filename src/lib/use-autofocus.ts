"use client";

import { useEffect, useState } from "react";

/**
 * Autofocus is a desktop convenience. On touch devices it pulls the keyboard
 * up the moment a sheet opens and pushes the layout around, so it stays off.
 */
export function useAutofocus() {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    setEnabled(window.matchMedia("(hover: hover) and (pointer: fine)").matches);
  }, []);

  return enabled;
}
