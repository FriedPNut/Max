// Keep this list in sync with PAGE_ROUTES in src/lib/routes.ts.
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
];

function routeSegments(route) {
  return route.split("/").filter(Boolean);
}

function routeExists(pathname) {
  const pathSegments = pathname.split("/").filter(Boolean);

  return PAGE_ROUTES.some((route) => {
    const segments = routeSegments(route);

    if (segments.length !== pathSegments.length) {
      return false;
    }

    return segments.every((segment, index) => {
      if (segment.startsWith("[") && segment.endsWith("]")) {
        return pathSegments[index].length > 0;
      }

      return segment === pathSegments[index];
    });
  });
}

function appUrl(path) {
  return new URL(path, self.location.origin).href;
}

// Never open a page that no longer exists: stale rows and old pushes land on
// Events, and the retired friends page lands on People.
function resolveInApp(rawUrl) {
  let destination;

  try {
    destination = new URL(
      typeof rawUrl === "string" && rawUrl ? rawUrl : "/notifications",
      self.location.origin
    );
  } catch {
    return appUrl("/events");
  }

  if (destination.origin !== self.location.origin) {
    return appUrl("/events");
  }

  const pathname =
    destination.pathname.length > 1
      ? destination.pathname.replace(/\/+$/, "") || "/"
      : destination.pathname;

  if (pathname === "/chat/friends") {
    return appUrl("/people");
  }

  if (!routeExists(pathname)) {
    return appUrl("/events");
  }

  return destination.href;
}

self.addEventListener("push", (event) => {
  let payload = {};

  if (event.data) {
    try {
      payload = event.data.json();
    } catch {
      // A plain-text payload still shows something useful.
      payload = { body: event.data.text() };
    }
  }

  const title = typeof payload.title === "string" ? payload.title : "Max";
  const body = typeof payload.body === "string" ? payload.body : "";
  const url = resolveInApp(payload.url);

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: "/icons/icon-192.png",
      tag: typeof payload.tag === "string" ? payload.tag : undefined,
      data: { url },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const safeUrl = resolveInApp(event.notification.data?.url);

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((windows) => {
      for (const client of windows) {
        if (new URL(client.url).origin === self.location.origin) {
          return client
            .navigate(safeUrl)
            .then((navigated) => navigated?.focus() ?? client.focus())
            .catch(() => client.focus());
        }
      }

      return self.clients.openWindow(safeUrl);
    })
  );
});
