self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = {};
  }

  const title = typeof payload.title === "string" ? payload.title : "Max";
  const body = typeof payload.body === "string" ? payload.body : "";
  const url = typeof payload.url === "string" ? payload.url : "/notifications";

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
  const rawUrl = event.notification.data?.url;
  const destination = new URL(
    typeof rawUrl === "string" ? rawUrl : "/notifications",
    self.location.origin
  );
  const safeUrl = destination.origin === self.location.origin
    ? destination.href
    : new URL("/notifications", self.location.origin).href;

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((windows) => {
      for (const client of windows) {
        if (new URL(client.url).origin === self.location.origin) {
          return client.navigate(safeUrl).then((navigated) => navigated?.focus() ?? client.focus());
        }
      }
      return self.clients.openWindow(safeUrl);
    })
  );
});
