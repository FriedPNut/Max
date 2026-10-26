"use client";

import { X } from "lucide-react";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { Avatar } from "@/components/ui";
import { lockPageScroll } from "@/lib/scroll-lock";
import type { StoryGroup } from "@/lib/stories";
import { useIslandHidden } from "@/lib/use-island-hidden";

const STORY_MS = 5_000;
const CLOSE_MS = 260;

type Direction = "forward" | "back";

/**
 * Full-screen stories. The progress bars tick for five seconds per story,
 * horizontal gestures move between people with a slide, and dragging down
 * shrinks and fades the card before closing.
 */
export function StoryViewer({
  groups,
  initialGroupIndex,
  onStorySeen,
  onClose,
}: {
  groups: StoryGroup[];
  initialGroupIndex: number;
  onStorySeen: (groupId: string, storyId: string) => void;
  onClose: () => void;
}) {
  const [groupIndex, setGroupIndex] = useState(() =>
    Math.min(Math.max(0, initialGroupIndex), Math.max(0, groups.length - 1))
  );
  const [storyIndex, setStoryIndex] = useState(0);
  const [direction, setDirection] = useState<Direction>("forward");
  const [paused, setPaused] = useState(false);
  const [progressKey, setProgressKey] = useState(0);
  const [offsetY, setOffsetY] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [closing, setClosing] = useState(false);
  const dragStart = useRef<{
    x: number;
    y: number;
    time: number;
    pointerId: number;
  } | null>(null);
  const draggingRef = useRef(false);
  const closingRef = useRef(false);
  const closeTimer = useRef<number | null>(null);

  const currentGroup = groups[groupIndex];
  const currentStory = currentGroup?.stories[storyIndex];

  useEffect(() => lockPageScroll(), []);
  useIslandHidden(true);

  useEffect(() => {
    return () => {
      if (closeTimer.current !== null) {
        window.clearTimeout(closeTimer.current);
      }
    };
  }, []);

  const finishClose = useCallback(() => {
    if (closingRef.current) {
      return;
    }

    closingRef.current = true;
    setClosing(true);
    setOffsetY(0);
    closeTimer.current = window.setTimeout(onClose, CLOSE_MS);
  }, [onClose]);

  const goToGroup = useCallback(
    (index: number, nextDirection: Direction) => {
      if (nextDirection === "forward" && index >= groups.length) {
        finishClose();
        return;
      }

      if (index < 0 || index >= groups.length) {
        return;
      }

      const target = groups[index];

      setDirection(nextDirection);
      setGroupIndex(index);
      setStoryIndex(
        nextDirection === "forward"
          ? 0
          : Math.max(0, target.stories.length - 1)
      );
      setOffsetY(0);
      setPaused(false);
      setProgressKey((current) => current + 1);
    },
    [finishClose, groups]
  );

  const advance = useCallback(() => {
    if (!currentGroup) {
      return;
    }

    if (storyIndex + 1 < currentGroup.stories.length) {
      setStoryIndex((current) => current + 1);
      setProgressKey((current) => current + 1);
      return;
    }

    goToGroup(groupIndex + 1, "forward");
  }, [currentGroup, goToGroup, groupIndex, storyIndex]);

  const back = useCallback(() => {
    if (!currentGroup) {
      return;
    }

    if (storyIndex > 0) {
      setStoryIndex((current) => current - 1);
      setProgressKey((current) => current + 1);
      return;
    }

    goToGroup(groupIndex - 1, "back");
  }, [currentGroup, goToGroup, groupIndex, storyIndex]);

  useEffect(() => {
    if (!currentStory || paused || closing) {
      return;
    }

    const timer = window.setTimeout(advance, STORY_MS);
    return () => window.clearTimeout(timer);
  }, [advance, closing, currentStory, paused, progressKey]);

  useEffect(() => {
    if (currentGroup && currentStory) {
      onStorySeen(currentGroup.id, currentStory.id);
    }
  }, [currentGroup, currentStory, onStorySeen]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        finishClose();
      } else if (event.key === "ArrowRight") {
        advance();
      } else if (event.key === "ArrowLeft") {
        back();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [advance, back, finishClose]);

  function handlePointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (closingRef.current) {
      return;
    }

    if (event.pointerType === "mouse" && event.button !== 0) {
      return;
    }

    dragStart.current = {
      x: event.clientX,
      y: event.clientY,
      time: performance.now(),
      pointerId: event.pointerId,
    };

    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // Synthetic pointers and older browsers cannot capture.
    }

    setPaused(true);
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    const start = dragStart.current;

    if (!start || closingRef.current) {
      return;
    }

    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;

    if (!draggingRef.current && Math.hypot(dx, dy) < 8) {
      return;
    }

    if (!draggingRef.current) {
      draggingRef.current = true;
      setDragging(true);
      setPaused(true);
    }

    if (Math.abs(dy) >= Math.abs(dx)) {
      setOffsetY(dy > 0 ? Math.min(dy, window.innerHeight * 0.5) : 0);
    } else {
      setOffsetY(0);
    }
  }

  function handlePointerUp(event: ReactPointerEvent<HTMLDivElement>) {
    const start = dragStart.current;
    dragStart.current = null;

    if (!start || closingRef.current) {
      return;
    }

    if (event.currentTarget.hasPointerCapture(start.pointerId)) {
      event.currentTarget.releasePointerCapture(start.pointerId);
    }

    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    const elapsed = Math.max(1, performance.now() - start.time);
    const wasDragging = draggingRef.current;

    draggingRef.current = false;
    setDragging(false);

    if (wasDragging) {
      if (dy > 110 || (dy > 40 && dy / elapsed > 0.5)) {
        finishClose();
        return;
      }

      if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy)) {
        if (dx < 0) {
          goToGroup(groupIndex + 1, "forward");
        } else {
          goToGroup(groupIndex - 1, "back");
        }
        return;
      }

      setOffsetY(0);
      setPaused(false);
      setProgressKey((current) => current + 1);
      return;
    }

    if (Math.hypot(dx, dy) < 10 && elapsed < 600) {
      const bounds = event.currentTarget.getBoundingClientRect();
      const x = event.clientX - bounds.left;

      setPaused(false);
      setProgressKey((current) => current + 1);

      if (x < bounds.width * 0.28) {
        back();
      } else {
        advance();
      }
    } else {
      setPaused(false);
      setProgressKey((current) => current + 1);
    }
  }

  function handlePointerCancel() {
    dragStart.current = null;
    draggingRef.current = false;
    setDragging(false);
    setOffsetY(0);
    setPaused(false);
    setProgressKey((current) => current + 1);
  }

  if (!currentGroup || !currentStory) {
    return null;
  }

  const scale = Math.max(0.88, 1 - offsetY / 1400);
  const contentOpacity = Math.max(0.3, 1 - offsetY / 500);
  const slideClass =
    direction === "forward" ? "story-slide-forward" : "story-slide-back";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${currentGroup.name}'s story`}
      data-no-swipe
      className="fixed inset-0 z-[60] flex justify-center overflow-hidden bg-scrim"
    >
      <div
        className="relative h-[100dvh] w-full max-w-[560px] touch-none overflow-hidden bg-scrim"
        style={{
          transform: closing
            ? "translate3d(0, 100%, 0) scale(0.9)"
            : `translate3d(0, ${offsetY}px, 0) scale(${scale})`,
          opacity: closing ? 0 : contentOpacity,
          transition: dragging
            ? "none"
            : `transform ${CLOSE_MS}ms var(--ease-spring), opacity 220ms var(--ease-out)`,
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
      >
        <div
          key={`${currentGroup.id}-${direction}`}
          className={`relative h-full w-full ${slideClass}`}
        >
          <div className="absolute inset-0 flex items-center justify-center bg-scrim">
            {currentStory.imageUrl ? (
              <img
                draggable={false}
                src={currentStory.imageUrl}
                alt={currentStory.caption || `${currentGroup.name}'s story`}
                className="h-full w-full object-contain"
              />
            ) : (
              <p className="text-sm text-on-primary/60">Photo unavailable.</p>
            )}
          </div>

          <div className="pointer-events-none absolute inset-x-0 top-0 z-20 bg-linear-to-b from-scrim/80 via-scrim/30 to-transparent pb-10">
            <div className="flex gap-1 px-3 pt-[calc(env(safe-area-inset-top,0px)+0.75rem)]">
              {currentGroup.stories.map((story, index) => (
                <span
                  key={story.id}
                  className="h-[2px] flex-1 overflow-hidden rounded-full bg-on-primary/30"
                  aria-hidden="true"
                >
                  {index < storyIndex ? (
                    <span className="block h-full w-full bg-on-primary" />
                  ) : index === storyIndex ? (
                    <span
                      key={`${story.id}-${progressKey}`}
                      className="story-progress-fill block h-full w-full bg-on-primary"
                      style={{
                        animationPlayState: paused ? "paused" : "running",
                      }}
                    />
                  ) : null}
                </span>
              ))}
            </div>

            <div className="mt-2 flex items-center gap-2 px-3 py-2">
              <Avatar
                src={currentGroup.avatarUrl}
                initial={currentGroup.initial}
                size={32}
              />
              <p className="min-w-0 truncate text-[15px] font-semibold text-on-primary">
                {currentGroup.name}
              </p>
              <span className="shrink-0 text-xs text-on-primary/70">
                {currentStory.relativeTime}
              </span>

              <button
                type="button"
                onPointerDown={(event) => event.stopPropagation()}
                onClick={finishClose}
                aria-label="Close story"
                className="pointer-events-auto ml-auto inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-on-primary transition-opacity duration-200 ease-out hover:opacity-80"
              >
                <X size={24} strokeWidth={1.75} aria-hidden="true" />
              </button>
            </div>
          </div>

          {currentStory.caption && (
            <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 bg-linear-to-t from-scrim/80 via-scrim/40 to-transparent px-4 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))] pt-16">
              <p className="selectable max-h-32 overflow-y-auto whitespace-pre-wrap break-words text-[15px] leading-snug text-on-primary">
                {currentStory.caption}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
