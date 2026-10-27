"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type MouseEvent,
  type ReactNode,
} from "react";
import { requestClientRefresh } from "@/lib/app-refresh";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { DockBar } from "@/components/shell/dock-bar";
import { TopBar } from "@/components/shell/top-bar";
import { IslandBar } from "@/components/shell/island-bar";
import {
  consumeRouteMotion,
  isBackLink,
  markRouteMotion,
  takeRouteContext,
} from "@/lib/nav-motion";
import {
  consumePendingNavigation,
  getTabScroll,
  rememberTabScroll,
  setPendingNavigation,
} from "@/lib/tab-memory";
import { rememberPageScroll, pageScroll } from "@/lib/scroll-memory";
import { resetPageScrollLock } from "@/lib/scroll-lock";
import {
  TAB_KEYS,
  TAB_ROOTS,
  TABS,
  getOriginTab,
  isRootTabPath,
  setOriginTab,
  tabForPath,
  tabRoot,
  type TabKey,
} from "@/lib/tabs";
import { resetIslandHidden, useIslandHiddenState } from "@/lib/use-island-hidden";
import { useKeyboardInset } from "@/lib/use-keyboard-inset";

const useIsomorphicLayoutEffect =
  typeof window === "undefined" ? useEffect : useLayoutEffect;

/**
 * The platform the head script set on <html>. Defaults to "ios" so the
 * server render and first client render match and keep the island.
 */
function usePlatform(): "ios" | "android" | "other" {
  const [platform, setPlatform] = useState<"ios" | "android" | "other">("ios");

  useEffect(() => {
    const value = document.documentElement.dataset.platform;
    if (value === "android" || value === "other") {
      setPlatform(value);
    }
  }, []);

  return platform;
}

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

    const reached = Math.abs(element.scrollTop - target) <= 2;

    if (reached || frame > 60) {
      element.removeEventListener("touchstart", cancel);
      element.removeEventListener("wheel", cancel);
      onDone();
      return;
    }

    requestAnimationFrame(tick);
  };

  requestAnimationFrame(tick);
}

export function AppShellClient({
  children,
  actions,
  left,
  title,
  userId,
  name,
  initial,
  avatarUrl,
  noIsland = false,
}: {
  children: ReactNode;
  actions?: ReactNode;
  left?: ReactNode;
  title?: string;
  userId: string;
  name: string;
  initial: string;
  avatarUrl: string | null;
  noIsland?: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const mainRef = useRef<HTMLElement | null>(null);
  const restoringRef = useRef(false);
  const handledPathRef = useRef<string | null>(null);
  const currentPathRef = useRef(pathname);
  const suppressClickUntilRef = useRef(0);
  const [scrolled, setScrolled] = useState(false);
  const [scrollHidden, setScrollHidden] = useState(false);
  const [enterClass, setEnterClass] = useState("");
  const [activeTab, setActiveTab] = useState<TabKey | null>(() =>
    tabForPath(pathname)
  );
  const [pullDistance, setPullDistance] = useState(0);
  const [pulling, setPulling] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const keyboardInset = useKeyboardInset();
  const overlayHidden = useIslandHiddenState();
  const platform = usePlatform();
  const islandHidden =
    noIsland || overlayHidden || keyboardInset > 0 || scrollHidden;

  // Every route change: pick the highlight, place the new page at the top,
  // and put the bar back in its resting state.
  useIsomorphicLayoutEffect(() => {
    // React Strict Mode runs effects twice in development; handle once.
    if (handledPathRef.current === pathname) {
      return;
    }

    handledPathRef.current = pathname;
    const element = mainRef.current;
    const pending = consumePendingNavigation(pathname);
    const context = takeRouteContext(pathname);
    const previousPath = context.previousPath;
    const routeMotion = consumeRouteMotion() ?? context.inferred;

    // A freshly pushed page always opens at the top; a back or forward
    // navigation returns to where that page was left.
    if (previousPath && previousPath !== pathname && element) {
      rememberPageScroll(previousPath, element.scrollTop);
    }

    // Scroll events from here on belong to the incoming page.
    currentPathRef.current = pathname;

    setScrollHidden(false);
    resetIslandHidden();
    // An overlay that navigated away must never leave the page locked.
    resetPageScrollLock();

    const ownTab = tabForPath(pathname);

    if (ownTab) {
      setOriginTab(ownTab);
    }

    setActiveTab(ownTab ?? getOriginTab());

    if (pending) {
      const canSlide = isRootTabPath(pathname);
      setEnterClass(
        canSlide && pending.direction === 1
          ? "tab-enter-right"
          : canSlide && pending.direction === -1
            ? "tab-enter-left"
            : "tab-enter-fade"
      );

      if (element) {
        if (pending.scroll > 0) {
          restoringRef.current = true;
          restoreScroll(element, pending.scroll, () => {
            restoringRef.current = false;
          });
        } else {
          element.scrollTop = 0;
        }
      }
    } else {
      setEnterClass(
        previousPath && previousPath !== pathname
          ? routeMotion === "back"
            ? "page-back-in"
            : "page-push-in"
          : ""
      );

      if (element) {
        const restored = routeMotion === "back" ? pageScroll(pathname) : 0;

        if (restored > 0) {
          restoringRef.current = true;
          restoreScroll(element, restored, () => {
            restoringRef.current = false;
          });
        } else {
          element.scrollTop = 0;
        }
      }
    }
  }, [pathname]);

  // The main column is the app's scroller, so the chrome listens to it rather
  // than the window.
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

        // Only a tab's root page keeps a scroll position.
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
        const atBottom =
          element.scrollHeight - element.clientHeight - y <= 4;

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

  const openTab = useCallback(
    (key: TabKey) => {
      const element = mainRef.current;
      const root = tabRoot(key);

      // Tapping the tab you are on scrolls to the top; at the top, it goes
      // back to that tab's root.
      if (pathname === root) {
        if (element && element.scrollTop > 8) {
          element.scrollTo({ top: 0, behavior: "smooth" });
          rememberTabScroll(key, 0);
          return;
        }

        element?.scrollTo({ top: 0 });
        return;
      }

      const owner = tabForPath(pathname);

      if (owner && pathname === tabRoot(owner) && element) {
        rememberTabScroll(owner, element.scrollTop);
      }

      const from = activeTab ? TAB_KEYS.indexOf(activeTab) : -1;
      const to = TAB_KEYS.indexOf(key);
      const direction: -1 | 0 | 1 =
        from < 0 || from === to ? 0 : to > from ? 1 : -1;

      setOriginTab(key);
      setPendingNavigation(root, getTabScroll(key), direction);
      router.push(root);
    },
    [activeTab, pathname, router]
  );

  // Horizontal swipes switch tabs on the four root tab pages only.
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

      // Leave the screen edges to the phone's own back gesture.
      if (
        touch.clientX <= 24 ||
        touch.clientX >= window.innerWidth - 24
      ) {
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

      if (Math.abs(dx) < 60) {
        return;
      }

      if (Math.abs(dx) <= Math.abs(dy) * 1.5) {
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

      suppressClickUntilRef.current = Date.now() + 400;
      rememberTabScroll(current, element.scrollTop);

      setOriginTab(next.key);
      setPendingNavigation(next.root, getTabScroll(next.key), dx < 0 ? 1 : -1);
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

  // Pull to refresh on the four root tabs. The main column is the scroller, so
  // this listens there, stays out of sheets and horizontal carousels, and
  // keeps overscroll-behavior: none on the page.
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

      // A horizontal scroller (calendar strip, filters) owns its gesture.
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

      if (Math.abs(dx) > Math.abs(dy)) {
        start = null;
        return;
      }

      if (element!.scrollTop > 0) {
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

      // Rubber-band: follows the finger, easing toward a 120px cap.
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

  function handleContentClick(event: MouseEvent<HTMLElement>) {
    if (Date.now() < suppressClickUntilRef.current) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }

    const target = event.target as Element | null;
    const anchor = target?.closest("a[href]");

    if (
      anchor instanceof HTMLAnchorElement &&
      !anchor.target &&
      !anchor.hasAttribute("download") &&
      !event.metaKey &&
      !event.ctrlKey &&
      !event.shiftKey &&
      !event.altKey
    ) {
      const url = new URL(anchor.href, window.location.href);

      if (url.origin === window.location.origin && url.pathname !== pathname) {
        markRouteMotion(
          isBackLink(url.pathname, pathname) ? "back" : "push"
        );
      }
    }
  }

  return (
    <div className="h-dvh w-full overflow-hidden bg-background text-text">
      <main
        ref={mainRef}
        className="h-full w-full overflow-x-hidden overflow-y-auto overscroll-none"
        onClickCapture={handleContentClick}
      >
        <header
          className="glass sticky top-0 z-40"
          data-no-swipe
          style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
        >
          <TopBar
            left={left}
            center={
              title ? (
                <span className="truncate text-base font-semibold text-text">{title}</span>
              ) : (
                <Link
                  href="/events"
                  aria-label="Max"
                  className="inline-flex min-h-11 items-center text-[26px] font-extrabold leading-none tracking-[-0.03em] text-text"
                >
                  Max
                </Link>
              )
            }
            right={
              <>
                <NotificationBell userId={userId} />
                {actions}
              </>
            }
          />

          <div
            aria-hidden="true"
            className="h-px bg-line transition-opacity duration-200 ease-out"
            style={{ opacity: scrolled ? 1 : 0 }}
          />
        </header>

        <div
          className="mx-auto w-full max-w-[560px] px-4 pt-6"
          style={{
            paddingBottom:
              platform === "ios"
                ? "calc(60px + 12px + env(safe-area-inset-bottom, 0px))"
                : "calc(56px + env(safe-area-inset-bottom, 0px) + 12px)",
          }}
        >
          <div key={pathname} className={enterClass}>
            {children}
          </div>
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

      {platform === "ios" ? (
        <IslandBar
          activeTab={activeTab}
          hidden={islandHidden}
          hrefs={TAB_ROOTS}
          profile={{ src: avatarUrl, initial, name }}
          onSelect={openTab}
        />
      ) : (
        <DockBar
          activeTab={activeTab}
          hidden={islandHidden}
          hrefs={TAB_ROOTS}
          profile={{ src: avatarUrl, initial, name }}
          onSelect={openTab}
        />
      )}
    </div>
  );
}
