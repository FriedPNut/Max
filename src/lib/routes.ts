/**
 * The app's page routes, written the same way Next names their folders.
 * scripts/check-links.mjs compares link targets against src/app, and the
 * notification routing below uses this list so a stale notification URL
 * never sends someone to a 404.
 */
const PAGE_ROUTES = [
  "/",
  "/best-of",
  "/best-of/[month]",
  "/birthdays",
  "/chat",
  "/chat/[id]",
  "/chat/[id]/details",
  "/chat/[id]/search",
  "/chat/friends",
  "/chat/new",
  "/events",
  "/events/[id]",
  "/events/[id]/calendar.ics",
  "/events/[id]/edit",
  "/events/ideas",
  "/events/new",
  "/feed",
  "/feed/[postId]",
  "/feed/new",
  "/free",
  "/hang",
  "/lists",
  "/lists/[id]",
  "/login",
  "/me",
  "/me/edit",
  "/me/friends",
  "/notifications",
  "/people",
  "/recap",
  "/settings",
  "/settings/appearance",
  "/settings/notifications",
  "/settings/notifications/debug",
  "/trips",
  "/trips/[id]",
  "/u/[username]",
  "/u/[username]/friends",
  "/welcome",
  "/wrapped/[year]",
] as const;

const FRIEND_TYPES = new Set([
  "friend_request",
  "friend_accepted",
  "buddy_request",
  "buddy_nudge",
]);
const CHAT_TYPES = new Set(["chat_message"]);
const POST_TYPES = new Set(["new_post", "post_comment"]);
const EVENT_TYPES = new Set(["new_event", "event_reminder", "trip_invite"]);

function segmentsOf(value: string) {
  return value.split("/").filter(Boolean);
}

/**
 * The path part of an internal URL, without its query or hash. Returns null
 * for external URLs, protocol-relative URLs and anything with a backslash.
 */
function internalPathname(target: string): string | null {
  const value = target.trim();

  if (
    !value.startsWith("/") ||
    value.startsWith("//") ||
    value.includes("\\")
  ) {
    return null;
  }

  const path = value.split(/[?#]/, 1)[0] || "/";
  const trimmed =
    path.length > 1 ? path.replace(/\/+$/, "") || "/" : path;

  return trimmed;
}

function matchesRoute(route: string, pathname: string) {
  const routeSegments = segmentsOf(route);
  const pathSegments = segmentsOf(pathname);

  if (routeSegments.length !== pathSegments.length) {
    return false;
  }

  return routeSegments.every((segment, index) => {
    if (segment.startsWith("[") && segment.endsWith("]")) {
      return pathSegments[index].length > 0;
    }

    return segment === pathSegments[index];
  });
}

function routeExists(pathname: string) {
  return (PAGE_ROUTES as readonly string[]).some((route) =>
    matchesRoute(route, pathname)
  );
}

function usernameFromNotification(item: {
  url: string | null;
  data: Record<string, unknown> | null;
}) {
  const data = item.data ?? {};

  for (const key of ["actor_username", "username", "sender_username"]) {
    const value = data[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim().replace(/^@/, "");
    }
  }

  const pathname = item.url ? internalPathname(item.url) : null;
  const match = pathname ? /^\/u\/([^/]+)$/.exec(pathname) : null;

  if (match) {
    try {
      return decodeURIComponent(match[1]);
    } catch {
      return match[1];
    }
  }

  return null;
}

function dataId(data: Record<string, unknown> | null, keys: string[]) {
  for (const key of keys) {
    const value = data?.[key];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
  }

  return null;
}

/**
 * Where a notification row or push should open. Chat rows open the
 * conversation, post rows the post, event rows the event, and friend rows the
 * sender's profile. Any target that no longer matches a route opens Events
 * instead of a 404.
 */
export function notificationDestination(item: {
  type: string;
  url: string | null;
  data?: Record<string, unknown> | null;
}) {
  const notification = {
    type: item.type,
    url: item.url,
    data: item.data ?? null,
  };

  if (FRIEND_TYPES.has(notification.type)) {
    const username = usernameFromNotification(notification);
    return username ? `/u/${encodeURIComponent(username)}` : "/people";
  }

  if (CHAT_TYPES.has(notification.type)) {
    const conversationId = dataId(notification.data, [
      "conversation_id",
      "conversationId",
    ]);
    if (conversationId) {
      return `/chat/${encodeURIComponent(conversationId)}`;
    }
  }

  if (POST_TYPES.has(notification.type)) {
    const postId = dataId(notification.data, ["post_id", "postId"]);
    if (postId) {
      return `/feed/${encodeURIComponent(postId)}`;
    }
  }

  if (EVENT_TYPES.has(notification.type)) {
    const eventId = dataId(notification.data, ["event_id", "eventId"]);
    if (eventId) {
      return `/events/${encodeURIComponent(eventId)}`;
    }
  }

  if (notification.url) {
    const pathname = internalPathname(notification.url);

    if (pathname === "/chat/friends") {
      return "/people";
    }

    if (pathname && routeExists(pathname)) {
      return notification.url;
    }
  }

  return "/events";
}
