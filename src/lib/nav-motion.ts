export type RouteMotion = "push" | "back";

let pending: { kind: RouteMotion; at: number } | null = null;
let lastPath: string | null = null;
let visited: string[] = [];

/** Mark the next route change; a link click knows whether it is a push. */
export function markRouteMotion(kind: RouteMotion) {
  pending = { kind, at: Date.now() };
}

/** Read and clear the pending motion, ignoring stale marks. */
export function consumeRouteMotion(): RouteMotion | null {
  if (!pending) {
    return null;
  }

  const value = Date.now() - pending.at > 1_500 ? null : pending.kind;
  pending = null;
  return value;
}

/**
 * Every page renders its own AppShell, so the shell remounts on each
 * navigation. Keep the visited path stack at module scope: a page already
 * earlier in the stack is a back navigation, even when the browser back
 * gesture bypasses our click handlers.
 */
export function takeRouteContext(pathname: string): {
  previousPath: string | null;
  inferred: RouteMotion | null;
} {
  const previousPath = lastPath;
  lastPath = pathname;

  if (!previousPath) {
    visited = [pathname];
    return { previousPath: null, inferred: null };
  }

  if (previousPath === pathname) {
    return { previousPath, inferred: null };
  }

  const index = visited.indexOf(pathname);

  if (index >= 0 && index < visited.length - 1) {
    visited = visited.slice(0, index + 1);
    return { previousPath, inferred: "back" };
  }

  if (index === -1) {
    visited.push(pathname);
  }

  return { previousPath, inferred: "push" };
}

/**
 * A link to a parent path (or a path with less depth) reads as going back, so
 * its transition runs in reverse even before the URL catches up.
 */
export function isBackLink(targetPath: string, currentPath: string) {
  if (targetPath === currentPath) {
    return false;
  }

  return (
    currentPath.startsWith(`${targetPath}/`) ||
    targetPath.split("/").filter(Boolean).length <
      currentPath.split("/").filter(Boolean).length
  );
}
