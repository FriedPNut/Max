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
import { IslandBar } from "@/components/shell/island-bar";
import {
  consumeRouteMotion,
  isBackLink,
  markRouteMotion,
  takeRouteContext,
} from "@/lib/nav-motion";
import {
  consumePendingNavigation,
  getTabMemory,
  rememberTabPage,
  resetTabToRoot,
  setPendingNavigation,
} from "@/lib/tab-memory";
import {
  TAB_KEYS,
  TABS,
  isRootTabPath,
  isTabPath,
  tabForPath,
  type TabKey,
} from "@/lib/tabs";
import { useIslandHiddenState } from "@/lib/use-island-hidden";
import { useKeyboardInset } from "@/lib/use-keyboard-inset";

const useIsomorphicLayoutEffect =
  typeof window === "undefined" ? useEffect : useLayoutEffect;

function initialHrefs(): Record<TabKey, string> {
  return TABS.reduce((hrefs, tab) => {
    hrefs[tab.key] = tab.root;
    return hrefs;
  }, {} as Record<TabKey, string>);
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
  userId,
  name,
  initial,
  avatarUrl,
  noIsland = false,
}: {
  children: ReactNode;
  actions?: ReactNode;
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
  const suppressClickUntilRef = useRef(0);
  const [scrolled, setScrolled] = useState(false);
  const [scrollHidden, setScrollHidden] = useState(false);
  const [enterClass, setEnterClass] = useState("");
  const [hrefs, setHrefs] = useState<Record<TabKey, string>>(initialHrefs);
  const [pullDistance, setPullDistance] = useState(0);
  const [pulling, setPulling] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const keyboardInset = useKeyboardInset();
  const overlayHidden = useIslandHiddenState();
  const activeTab = tabForPath(pathname);
  const islandHidden =
    noIsland || overlayHidden || keyboardInset > 0 || scrollHidden;

  // Restore the tab's page and scroll position after an island tap, and keep
  // the tab hrefs pointed at each tab's last page.
  useIsomorphicLayoutEffect(() => {
    // React Strict Mode runs effects twice in development; restore once.
    if (handledPathRef.current === pathname) {
      return;
    }

    handledPathRef.current = pathname;
    const element = mainRef.current;
    const pending = consumePendingNavigation(pathname);
    const context = takeRouteContext(pathname);
    const previousPath = context.previousPath;
    const routeMotion = consumeRouteMotion() ?? context.inferred;
    setScrollHidden(false);

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
        element.scrollTop = 0;
      }

      const tab = tabForPath(pathname);

      if (tab) {
        rememberTabPage(tab, pathname, 0);
      }
    }

    const memory = getTabMemory();
    setHrefs(
      TABS.reduce((next, tab) => {
        const remembered = memory[tab.key]?.path;
        next[tab.key] = remembered && isTabPath(tab.key, remembered)
          ? remembered
          : tab.root;
        return next;
      }, {} as Record<TabKey, string>)
    );
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

        const y = element.scrollTop;
        setScrolled(y > 4);

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

        const tab = tabForPath(pathname);

        if (tab) {
          rememberTabPage(tab, pathname, y);
        }
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
      const tab = TABS.find((entry) => entry.key === key);

      if (!tab) {
        return;
      }

      if (key === activeTab) {
        if (element && element.scrollTop > 8) {
          element.scrollTo({ top: 0, behavior: "smooth" });
          rememberTabPage(key, pathname, 0);
          return;
        }

        if (pathname !== tab.root) {
          resetTabToRoot(key);
          setPendingNavigation(tab.root, 0, 0);
          setHrefs((current) => ({ ...current, [key]: tab.root }));
          router.push(tab.root);
          return;
        }

        element?.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }

      if (element && activeTab) {
        rememberTabPage(activeTab, pathname, element.scrollTop);
      }

      const memory = getTabMemory()[key];
      const target =
        memory && isTabPath(key, memory.path) ? memory.path : tab.root;
      const scroll = memory && target === memory.path ? memory.scroll : 0;
      const from = activeTab ? TAB_KEYS.indexOf(activeTab) : -1;
      const to = TAB_KEYS.indexOf(key);
      const direction: -1 | 0 | 1 =
        from < 0 ? 0 : to > from ? 1 : to < from ? -1 : 0;

      setPendingNavigation(target, scroll, direction);
      setHrefs((current) => ({ ...current, [key]: target }));
      router.push(target);
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
      rememberTabPage(current, pathname, element.scrollTop);

      const memory = getTabMemory()[next.key];
      const target =
        memory && isTabPath(next.key, memory.path)
          ? memory.path
          : next.root;
      const scroll = memory && target === memory.path ? memory.scroll : 0;

      setPendingNavigation(target, scroll, dx < 0 ? 1 : -1);
      setHrefs((currentHrefs) => ({
        ...currentHrefs,
        [next.key]: target,
      }));
      router.push(target);
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
          <div className="mx-auto flex h-12 w-full max-w-[560px] items-center justify-between gap-2 px-4">
            <Link
              href="/events"
              aria-label="Max"
              className="inline-flex min-h-11 items-center text-[24px] font-extrabold leading-none tracking-[-0.03em] text-text"
            >
              Max
            </Link>

            <div className="flex items-center gap-1">
              <NotificationBell userId={userId} />
              {actions}
            </div>
          </div>

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
              "calc(60px + 12px + env(safe-area-inset-bottom, 0px))",
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
        style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 48px)" }}
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

      <IslandBar
        activeTab={activeTab}
        hidden={islandHidden}
        hrefs={hrefs}
        profile={{ src: avatarUrl, initial, name }}
        onSelect={openTab}
      />
    </div>
  );
}
