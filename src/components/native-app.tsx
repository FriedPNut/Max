"use client";

import { useEffect } from "react";

const TEXT_ENTRY_SELECTOR = "input, textarea, select, [contenteditable='true']";
const APP_CHROME_SELECTOR = "img, a, button, svg, [role='button']";

/**
 * Turns off the browser gestures that make a web page feel like a website:
 * iOS pinch zoom (which ignores user-scalable=no), multi-touch scrolling, and
 * the long-press callout menu on images, links and buttons. Text fields keep
 * their own menu so paste and spellcheck still work.
 */
export function NativeApp() {
  useEffect(() => {
    function preventDefault(event: Event) {
      event.preventDefault();
    }

    function onTouchMove(event: TouchEvent) {
      if (event.touches.length > 1) {
        event.preventDefault();
      }
    }

    function onContextMenu(event: MouseEvent) {
      const target = event.target as Element | null;

      if (!target || target.closest(TEXT_ENTRY_SELECTOR)) {
        return;
      }

      if (target.closest(APP_CHROME_SELECTOR)) {
        event.preventDefault();
      }
    }

    document.addEventListener("gesturestart", preventDefault, {
      passive: false,
    });
    document.addEventListener("gesturechange", preventDefault, {
      passive: false,
    });
    document.addEventListener("gestureend", preventDefault, { passive: false });
    document.addEventListener("touchmove", onTouchMove, { passive: false });
    document.addEventListener("contextmenu", onContextMenu);

    return () => {
      document.removeEventListener("gesturestart", preventDefault);
      document.removeEventListener("gesturechange", preventDefault);
      document.removeEventListener("gestureend", preventDefault);
      document.removeEventListener("touchmove", onTouchMove);
      document.removeEventListener("contextmenu", onContextMenu);
    };
  }, []);

  return null;
}
