"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import { lockPageScroll } from "@/lib/scroll-lock";
import { useIslandHidden } from "@/lib/use-island-hidden";
import { useKeyboardInset } from "@/lib/use-keyboard-inset";

const CLOSE_MS = 300;

/**
 * Bottom sheet: dim backdrop, 20px top radius, grabber, scrollable content and
 * safe-area padding. The panel glides up on the spring curve; dragging the
 * grabber down with velocity, tapping the backdrop or pressing Escape closes
 * it. Pointer events keep it dependency-free and it respects the keyboard.
 */
export function Sheet({
  label,
  onClose,
  children,
  className = "",
  fullHeight = false,
}: {
  label: string;
  onClose: () => void;
  children: ReactNode;
  className?: string;
  fullHeight?: boolean;
}) {
  const keyboardInset = useKeyboardInset();
  const [closing, setClosing] = useState(false);
  const [dragY, setDragY] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [ready, setReady] = useState(false);
  const closeTimer = useRef<number | null>(null);
  const readyTimer = useRef<number | null>(null);
  const dragStart = useRef<{
    y: number;
    lastY: number;
    lastTime: number;
    pointerId: number;
  } | null>(null);
  const dragYRef = useRef(0);
  const velocityRef = useRef(0);
  const dragged = useRef(false);

  useEffect(() => lockPageScroll(), []);

  // A sheet covers the bottom of the screen, so the island gets out of the way.
  useIslandHidden(true);

  useEffect(() => {
    readyTimer.current = window.setTimeout(() => setReady(true), 340);

    return () => {
      if (readyTimer.current !== null) {
        window.clearTimeout(readyTimer.current);
      }

      if (closeTimer.current !== null) {
        window.clearTimeout(closeTimer.current);
      }
    };
  }, []);

  const requestClose = useCallback(() => {
    if (closing) {
      return;
    }

    setClosing(true);
    closeTimer.current = window.setTimeout(onClose, CLOSE_MS);
  }, [closing, onClose]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        requestClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [requestClose]);

  function handleDragStart(event: ReactPointerEvent<HTMLDivElement>) {
    if (closing || !ready) {
      return;
    }

    if (event.pointerType === "mouse" && event.button !== 0) {
      return;
    }

    const now = performance.now();
    dragged.current = false;
    dragYRef.current = 0;
    velocityRef.current = 0;
    dragStart.current = {
      y: event.clientY,
      lastY: event.clientY,
      lastTime: now,
      pointerId: event.pointerId,
    };
  }

  function handleDragMove(event: ReactPointerEvent<HTMLDivElement>) {
    const start = dragStart.current;

    if (!start || closing) {
      return;
    }

    const delta = event.clientY - start.y;

    if (delta <= 0) {
      if (dragging) {
        dragYRef.current = 0;
        setDragY(0);
      }
      return;
    }

    if (!dragging && delta < 6) {
      return;
    }

    if (!dragging) {
      try {
        event.currentTarget.setPointerCapture(event.pointerId);
      } catch {
        // Synthetic pointers (and some older browsers) cannot be captured.
      }
      setDragging(true);
    }

    dragged.current = true;

    const now = performance.now();
    velocityRef.current =
      (event.clientY - start.lastY) / Math.max(1, now - start.lastTime);
    start.lastY = event.clientY;
    start.lastTime = now;

    // Rubber-band: the panel follows the finger, but slower as it stretches.
    const pull = Math.min(320, delta);
    const next = pull > 120 ? 120 + (pull - 120) * 0.55 : pull;
    dragYRef.current = next;
    setDragY(next);
  }

  function handleDragEnd(event: ReactPointerEvent<HTMLDivElement>) {
    const start = dragStart.current;
    dragStart.current = null;

    if (!start) {
      return;
    }

    if (event.currentTarget.hasPointerCapture(start.pointerId)) {
      event.currentTarget.releasePointerCapture(start.pointerId);
    }

    if (!dragging) {
      return;
    }

    const shouldClose =
      dragYRef.current > 100 || velocityRef.current > 0.55;

    setDragging(false);

    if (shouldClose) {
      requestClose();
      return;
    }

    dragYRef.current = 0;
    setDragY(0);

    // If the drag ended outside the content, do not swallow the next tap.
    window.setTimeout(() => {
      dragged.current = false;
    }, 50);
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={label}
      data-no-swipe
      onClick={requestClose}
      className={`fixed inset-0 z-50 flex items-end justify-center ${
        closing ? "" : "sheet-backdrop"
      }`}
      style={{
        paddingBottom: keyboardInset,
        opacity: closing ? 0 : undefined,
        transition: closing ? "opacity 200ms var(--ease-out)" : undefined,
      }}
    >
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-scrim/40"
        style={{
          opacity: Math.max(0.2, 1 - dragY / 420),
          transition: dragging ? "none" : "opacity 200ms var(--ease-out)",
        }}
      />

      <div
        onClick={(event) => event.stopPropagation()}
        className="relative w-full max-w-[560px]"
        style={{
          transform: closing
            ? "translate3d(0, 100%, 0)"
            : `translate3d(0, ${dragY}px, 0)`,
          transition: dragging
            ? "none"
            : closing
            ? "transform 300ms var(--ease-spring)"
            : "transform 320ms var(--ease-spring)",
        }}
      >
        <div
          className={`w-full rounded-t-sheet bg-surface pb-[calc(1rem+env(safe-area-inset-bottom,0px))] ${
            fullHeight
              ? "flex h-[100dvh] max-h-[100dvh] flex-col overflow-hidden"
              : "max-h-[92dvh] overflow-y-auto"
          } ${closing ? "" : "sheet-panel-inner"}`}
          style={
            fullHeight
              ? {
                  height: keyboardInset
                    ? `calc(100dvh - ${keyboardInset}px)`
                    : "100dvh",
                  maxHeight: keyboardInset
                    ? `calc(100dvh - ${keyboardInset}px)`
                    : "100dvh",
                }
              : {
                  maxHeight: keyboardInset
                    ? `calc(100dvh - ${keyboardInset}px - 8px)`
                    : undefined,
                }
          }
        >
          <div
            className="sticky top-0 z-10 flex shrink-0 cursor-grab touch-none justify-center bg-surface pb-1 pt-2 active:cursor-grabbing"
            onPointerDown={handleDragStart}
            onPointerMove={handleDragMove}
            onPointerUp={handleDragEnd}
            onPointerCancel={handleDragEnd}
          >
            <span aria-hidden="true" className="h-1 w-9 rounded-full bg-line" />
          </div>

          <div
            className={`px-4 pt-2 ${
              fullHeight ? "min-h-0 flex-1 overflow-y-auto" : ""
            } ${className}`.trim()}
            onClick={(event) => {
              // A drag that ends on content must not also activate that content.
              if (dragged.current) {
                event.preventDefault();
                event.stopPropagation();
                dragged.current = false;
              }
            }}
          >
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
