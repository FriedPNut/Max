"use client";

let navigationStartedAt = 0;

/** Dev-only timing: call on pointerdown, log when the new route is mounted. */
export function markNavigationStart() {
  if (process.env.NODE_ENV === "production") return;
  navigationStartedAt = performance.now();
}

export function logNavigation(pathname: string) {
  if (process.env.NODE_ENV === "production" || !navigationStartedAt) return;

  const elapsed = performance.now() - navigationStartedAt;
  navigationStartedAt = 0;
  console.debug(`[perf] nav ${pathname} ${elapsed.toFixed(0)}ms`);
}
