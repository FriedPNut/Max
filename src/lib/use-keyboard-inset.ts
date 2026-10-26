"use client";

import { useEffect, useState } from "react";

/**
 * Height in px of the on-screen keyboard (0 when closed), measured from the
 * visual viewport so a fixed composer can sit just above the keyboard instead
 * of shifting the page.
 */
export function useKeyboardInset() {
  const [inset, setInset] = useState(0);

  useEffect(() => {
    const activeViewport = window.visualViewport;

    if (!activeViewport) {
      return;
    }

    const viewport: VisualViewport = activeViewport;

    function update() {
      const covered =
        window.innerHeight - viewport.height - viewport.offsetTop;
      // Browser toolbars move the viewport a few pixels; ignore those.
      setInset(covered > 80 ? Math.round(covered) : 0);
    }

    update();
    viewport.addEventListener("resize", update);
    viewport.addEventListener("scroll", update);

    return () => {
      viewport.removeEventListener("resize", update);
      viewport.removeEventListener("scroll", update);
    };
  }, []);

  return inset;
}
