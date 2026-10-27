"use client";

import { useEffect, useRef, useState } from "react";
import { updateBubbleColorAction } from "@/app/actions/chat-color";
import {
  DEFAULT_BUBBLE_COLOR,
  applyBubbleColor,
  normalizeHex,
} from "@/lib/bubble-colors";

/**
 * One chat color, applied the moment it is picked and saved shortly after (a
 * drag on the native picker fires many changes). A failed save rolls back.
 */
export function useChatColor(initial: string | null | undefined) {
  const saved = normalizeHex(initial) ?? DEFAULT_BUBBLE_COLOR;
  const [color, setColor] = useState(saved);
  const [error, setError] = useState<string | null>(null);
  const stored = useRef(saved);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    stored.current = saved;
    setColor(saved);
    applyBubbleColor(saved);
  }, [saved]);

  useEffect(() => {
    return () => {
      if (timer.current !== null) {
        window.clearTimeout(timer.current);
      }
    };
  }, []);

  function choose(hex: string) {
    setColor(hex);
    setError(null);
    applyBubbleColor(hex);

    if (timer.current !== null) {
      window.clearTimeout(timer.current);
    }

    timer.current = window.setTimeout(() => {
      timer.current = null;

      void updateBubbleColorAction(hex).then((result) => {
        if (!result.error) {
          stored.current = hex;
          return;
        }

        setError(result.error);
        setColor(stored.current);
        applyBubbleColor(stored.current);
      });
    }, 350);
  }

  return { color, choose, error, reset: () => choose(DEFAULT_BUBBLE_COLOR) };
}
