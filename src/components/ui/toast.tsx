"use client";

import { useEffect, useRef, useState } from "react";

/**
 * A single short-lived toast in the inverted pill style. It sits above the
 * island bar, slides up on mount and fades out after 2.5 seconds.
 */
export function Toast({
  message,
  onDone,
}: {
  message: string | null;
  onDone: () => void;
}) {
  const [leaving, setLeaving] = useState(false);
  const doneRef = useRef(onDone);
  doneRef.current = onDone;

  useEffect(() => {
    if (!message) {
      setLeaving(false);
      return;
    }

    setLeaving(false);
    const fadeTimer = window.setTimeout(() => setLeaving(true), 2_300);
    const doneTimer = window.setTimeout(() => doneRef.current(), 2_520);

    return () => {
      window.clearTimeout(fadeTimer);
      window.clearTimeout(doneTimer);
    };
  }, [message]);

  if (!message) {
    return null;
  }

  return (
    <div
      className="pointer-events-none fixed inset-x-0 z-50 flex justify-center px-8"
      style={{
        bottom:
          "calc(env(safe-area-inset-bottom, 0px) + 60px + 12px + 16px)",
      }}
    >
      <div
        role="status"
        aria-live="polite"
        data-leaving={leaving ? "true" : "false"}
        className="toast max-w-full rounded-full bg-text px-4 py-2.5 text-sm font-semibold text-background shadow-pop"
      >
        {message}
      </div>
    </div>
  );
}
