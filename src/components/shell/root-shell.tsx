"use client";

import { usePathname, useRouter } from "next/navigation";
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { requestClientRefresh } from "@/lib/app-refresh";
import { MainHeader } from "@/components/shell/headers";
import { TabBar } from "@/components/shell/tab-bar";
import {
  consumeRouteMotion,
  takeRouteContext,
} from "@/lib/nav-motion";
import { logNavigation } from "@/lib/perf";
import { pageScroll, rememberPageScroll } from "@/lib/scroll-memory";
import { resetPageScrollLock } from "@/lib/scroll-lock";
import {
  clearPendingNavigation,
  consumePendingNavigation,
  getTabScroll,
  rememberTabScroll,
  setPendingNavigation,
} from "@/lib/tab-memory";
import {
  isFullScreenPath,
  isImmersivePath,
  isRootTabPath,
  tabForPath,
  TABS,
  TAB_KEYS,
} from "@/lib/tabs";
import { resetIslandHidden, useIslandHiddenState } from "@/lib/use-island-hidden";
import { useKeyboardInset } from "@/lib/use-keyboard-inset";

const useIsomorphicLayoutEffect =
  typeof window === "undefined" ? useEffect : useLayoutEffect;

/** Scrolls the main container to a remembered position while content loads. */
function restoreScroll(
  element: HTMLElement,
  target: number,
  onDone: () => void
) {
  if (target <= 0) {
    element.scrollTop = 0;
    onDone();
    return;
  }

  let frame = 0;
  let cancelled = false;

  const cancel = () => {
    cancelled = true;
  };

  element.addEventListener("touchstart", cancel, { passive: true, once: true });
  element.addEventListener("wheel", cancel, { passive: true, once: true });

  const tick = () => {
    if (cancelled) {
      onDone();
      return;
    }

    element.scrollTop = target;
    frame += 1;

    if (Math.abs(element.scrollTop - target) <= 2 || frame > 60) {
      element.removeEventListener("touchstart", cancel);
      element.removeEventListener("wheel", cancel);
      onDone();
      return;
    }

    requestAnimationFrame(tick);
  };

  requestAnimationFrame(tick);
}

/**
 * The app frame, mounted once in the root layout:
 *
 * - the scrolling column every page renders into,
 * - the only tab bar in the app,
 * - the root header on the four tab roots,
 * - pull-to-refresh and tab swipes, both of which live on the scroller and
 *   never sit above the bar.
 *
 * The auth and onboarding screens render on their own, with no frame at all.
 */
export function RootShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const mainRef = useRef<HTMLElement | null>(null);
  const restoringRef = useRef(false);
  const handledPathRef = useRef<string | null>(null);
  const currentPathRef = useRef(pathname);
  const [scrolled, setScrolled] = useState(false);
  const [scrollHidden, setScrollHidden] = useState(false);
  const [enterClass, setEnterClass] = useState("");
  const [pullDistance, setPullDistance] = useState(0);
  const [pulling, setPulling] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const keyboardInset = useKeyboardInset();
  const overlayHidden = useIslandHiddenState();
  const isRoot = isRootTabPath(pathname);
  // A conversation is a fixed, full-window frame: it never joins the page
  // scroller, so its composer can't be pushed around by its content.
  const immersive = isImmersivePath(pathname);
  // Only structural reasons hide the bar here; scrolling is a CSS decision so
  // the docked bar can stay put on Android while the iOS island steps aside.
  const barHidden =
    isFullScreenPath(pathname) || overlayHidden || keyboardInset > 0;

  // Every route change: place the new page, pick the transition, tidy up.
  useIsomorphicLayoutEffect(() => {
    if (handledPathRef.current === pathname) {
      return;
    }

    handledPathRef.current = pathname;
    logNavigation(pathname);

    const element = mainRef.current;
    const pending = consumePendingNavigation(pathname);
    const context = takeRouteContext(pathname);
    const previousPath = context.previousPath;
    const routeMotion = consumeRouteMotion() ?? context.inferred;

    if (previousPath && previousPath !== pathname && element) {
      rememberPageScroll(previousPath, element.scrollTop);
    }

    currentPathRef.current = pathname;

    setScrollHidden(false);
    resetIslandHidden();
    resetPageScrollLock();

    // A tab switch is never animated: the highlight has already moved and a
    // sliding page would fight it.
    if (pending) {
      setEnterClass("");
    } else {
      setEnterClass(
        previousPath && previousPath !== pathname
          ? routeMotion === "back"
            ? "page-back-in"
            : "page-push-in"
          : ""
      );
    }

    if (!element) {
      return;
    }

    const target = pending
      ? pending.scroll
      : routeMotion === "back"
        ? pageScroll(pathname)
        : 0;

    if (target > 0) {
      restoringRef.current = true;
      restoreScroll(element, target, () => {
        restoringRef.current = false;
      });
    } else {
      element.scrollTop = 0;
    }
  }, [pathname]);

  // Warm the four tab roots once the first screen is interactive.
  useEffect(() => {
    const warm = () => {
      for (const tab of TABS) router.prefetch(tab.root);
    };
    const idle = window.requestIdleCallback;

    if (idle) {
      const id = idle(warm, { timeout: 1500 });
      return () => window.cancelIdleCallback?.(id);
    }

    const timer = window.setTimeout(warm, 300);
    return () => window.clearTimeout(timer);
  }, [router]);

  // The main column is the app's scroller, so the chrome listens to it.
  useEffect(() => {
    const element = mainRef.current;

    if (!element) {
      return;
    }

    let lastY = element.scrollTop;
    let frame = 0;

    const onScroll = () => {
      if (frame) {
        return;
      }

      frame = requestAnimationFrame(() => {
        frame = 0;

        const path = currentPathRef.current;
        const y = element.scrollTop;
        setScrolled(y > 4);
        rememberPageScroll(path, y);

        if (isRootTabPath(path)) {
          const tab = tabForPath(path);

          if (tab) {
            rememberTabScroll(tab, y);
          }
        }

        if (restoringRef.current) {
          lastY = y;
          return;
        }

        const delta = y - lastY;
        const atTop = y <= 24;
        const atBottom = element.scrollHeight - element.clientHeight - y <= 4;

        if (atTop || atBottom) {
          setScrollHidden(false);
        } else if (delta > 6) {
          setScrollHidden(true);
        } else if (delta < -6) {
          setScrollHidden(false);
        }

        lastY = y;
      });
    };

    element.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    return () => {
      element.removeEventListener("scroll", onScroll);

      if (frame) {
        cancelAnimationFrame(frame);
      }
    };
  }, [pathname]);

  // Horizontal swipes switch tabs on the four root tab pages only. The
  // threshold is high and nothing is preventDefault-ed until it is passed, so a
  // tap anywhere (including one that ends in a tiny wobble) still lands.
  useEffect(() => {
    const element = mainRef.current;

    if (!element || !isRootTabPath(pathname)) {
      return;
    }

    let startX = 0;
    let startY = 0;
    let tracking = false;
    let fired = false;

    const onTouchStart = (event: TouchEvent) => {
      if (event.touches.length !== 1) {
        tracking = false;
        return;
      }

      const touch = event.touches[0];
      const target = event.target as Element | null;

      if (!touch || !target || target.closest("[data-no-swipe]")) {
        tracking = false;
        return;
      }

      if (touch.clientX <= 24 || touch.clientX >= window.innerWidth - 24) {
        tracking = false;
        return;
      }

      startX = touch.clientX;
      startY = touch.clientY;
      tracking = true;
      fired = false;
    };

    const onTouchMove = (event: TouchEvent) => {
      if (!tracking || fired || event.touches.length !== 1) {
        return;
      }

      const touch = event.touches[0];

      if (!touch) {
        return;
      }

      const dx = touch.clientX - startX;
      const dy = touch.clientY - startY;

      if (Math.abs(dx) < 60 || Math.abs(dx) <= Math.abs(dy) * 1.5) {
        return;
      }

      const current = tabForPath(pathname);

      if (!current) {
        return;
      }

      const index = TAB_KEYS.indexOf(current);
      const next = TABS[index + (dx < 0 ? 1 : -1)];

      if (!next) {
        return;
      }

      fired = true;
      tracking = false;

      if (event.cancelable) {
        event.preventDefault();
      }

      rememberTabScroll(current, element.scrollTop);
      setPendingNavigation(next.root, getTabScroll(next.key), 0);
      router.push(next.root);
    };

    const onTouchEnd = () => {
      tracking = false;
    };

    element.addEventListener("touchstart", onTouchStart, { passive: true });
    element.addEventListener("touchmove", onTouchMove, { passive: false });
    element.addEventListener("touchend", onTouchEnd);
    element.addEventListener("touchcancel", onTouchEnd);

    return () => {
      element.removeEventListener("touchstart", onTouchStart);
      element.removeEventListener("touchmove", onTouchMove);
      element.removeEventListener("touchend", onTouchEnd);
      element.removeEventListener("touchcancel", onTouchEnd);
    };
  }, [pathname, router]);

  // Pull to refresh on the four root tabs.
  useEffect(() => {
    const element = mainRef.current;

    if (!element || !isRootTabPath(pathname) || overlayHidden) {
      return;
    }

    let start: { x: number; y: number } | null = null;
    let fingerDistance = 0;
    let active = false;

    function onTouchStart(event: TouchEvent) {
      if (refreshing || event.touches.length !== 1) {
        return;
      }

      if (element!.scrollTop > 0) {
        return;
      }

      const touch = event.touches[0];
      const target = event.target as Element | null;

      if (!touch || !target) {
        return;
      }

      if (
        target.closest(
          "[data-no-swipe], [role='dialog'], input, textarea, select, [contenteditable='true']"
        )
      ) {
        return;
      }

      for (let node = target as HTMLElement | null; node && node !== element; node = node.parentElement) {
        if (node.scrollWidth > node.clientWidth + 2) {
          const overflowX = window.getComputedStyle(node).overflowX;

          if (overflowX === "auto" || overflowX === "scroll") {
            return;
          }
        }
      }

      start = { x: touch.clientX, y: touch.clientY };
      fingerDistance = 0;
      active = false;
    }

    function onTouchMove(event: TouchEvent) {
      if (!start || refreshing || event.touches.length !== 1) {
        return;
      }

      const touch = event.touches[0];

      if (!touch) {
        return;
      }

      const dx = touch.clientX - start.x;
      const dy = touch.clientY - start.y;

      if (dy <= 0) {
        if (active) {
          active = false;
          setPulling(false);
          setPullDistance(0);
        }
        return;
      }

      if (Math.abs(dx) > Math.abs(dy) || element!.scrollTop > 0) {
        start = null;
        setPulling(false);
        setPullDistance(0);
        return;
      }

      fingerDistance = dy;

      if (!active && dy < 6) {
        return;
      }

      active = true;
      setPulling(true);

      if (event.cancelable) {
        event.preventDefault();
      }

      setPullDistance(120 * (1 - Math.exp(-dy / 90)));
    }

    function finishPull() {
      if (!start) {
        return;
      }

      const distance = fingerDistance;
      start = null;
      fingerDistance = 0;
      active = false;

      if (distance >= 70) {
        setPulling(false);
        setRefreshing(true);
        setPullDistance(56);
        router.refresh();
        requestClientRefresh();
        clearPendingNavigation();

        window.setTimeout(() => {
          setRefreshing(false);
          setPullDistance(0);
        }, 500);
        return;
      }

      setPulling(false);
      setPullDistance(0);
    }

    element.addEventListener("touchstart", onTouchStart, { passive: true });
    element.addEventListener("touchmove", onTouchMove, { passive: false });
    element.addEventListener("touchend", finishPull);
    element.addEventListener("touchcancel", finishPull);

    return () => {
      element.removeEventListener("touchstart", onTouchStart);
      element.removeEventListener("touchmove", onTouchMove);
      element.removeEventListener("touchend", finishPull);
      element.removeEventListener("touchcancel", finishPull);
      setPulling(false);
      setPullDistance(0);
    };
  }, [pathname, overlayHidden, refreshing, router]);

  if (pathname === "/login" || pathname === "/welcome") {
    return <>{children}</>;
  }

  return (
    <div className="h-dvh w-full overflow-hidden bg-background text-text">
      <main
        ref={mainRef}
        data-shell-scroll
        className="shell-scroll h-full w-full overflow-x-hidden overflow-y-auto overscroll-none"
      >
        {isRoot ? <MainHeader scrolled={scrolled} /> : null}

        {/*
         * The transition class is dropped once it has played: a filled
         * transform animation keeps this wrapper as the containing block for
         * every fixed child, which is what used to drag page chrome around.
         */}
        <div
          key={pathname}
          onAnimationEnd={(event) => {
            if (event.target === event.currentTarget) {
              setEnterClass("");
            }
          }}
          className={immersive ? `fixed inset-0 overflow-hidden ${enterClass}` : enterClass}
          style={
            immersive
              ? undefined
              : {
                  paddingBottom: isFullScreenPath(pathname)
                    ? undefined
                    : "var(--bar-h)",
                }
          }
        >
          {children}
        </div>
      </main>

      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-x-0 top-0 z-30 flex justify-center"
        style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 56px)" }}
      >
        <div
          className="pull-indicator flex h-9 w-9 items-center justify-center rounded-full bg-surface shadow-control"
          style={{
            opacity: refreshing ? 1 : Math.min(1, pullDistance / 24),
            transform: `translate3d(0, ${
              refreshing ? 16 : Math.max(0, pullDistance - 8)
            }px, 0)`,
            transition: pulling ? "none" : undefined,
          }}
        >
          <span
            className={`h-5 w-5 rounded-full border-2 border-line border-t-primary ${
              refreshing ? "animate-spin" : ""
            }`}
            style={
              refreshing
                ? undefined
                : {
                    transform: `rotate(${pullDistance * 3}deg) scale(${
                      0.55 + Math.min(1, pullDistance / 70) * 0.45
                    })`,
                  }
            }
          />
        </div>
      </div>

      <TabBar hidden={barHidden} scrolled={scrollHidden} />
    </div>
  );
}

