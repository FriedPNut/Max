export type NotificationSetupState =
  | "loading"
  | "ready"
  | "not-asked"
  | "blocked"
  | "ios-needs-install"
  | "app-off"
  | "unsupported"
  | "not-configured";

export type NotificationPermissionState = "default" | "granted" | "denied";

// "needs-repair" is internal: permission is granted but this browser isn't
// saved on the server, so the hook should subscribe quietly once.
export type NotificationSetupDecision = NotificationSetupState | "needs-repair";

export function notificationSetupStateFor({
  vapidKeyPresent,
  supported,
  iosNeedsInstall,
  permission,
  pushEnabled,
  hasSubscription,
  serverHasEndpoint,
}: {
  vapidKeyPresent: boolean;
  supported: boolean;
  iosNeedsInstall: boolean;
  permission: NotificationPermissionState;
  pushEnabled: boolean;
  hasSubscription: boolean;
  serverHasEndpoint: boolean | null;
}): NotificationSetupDecision {
  if (!vapidKeyPresent) return "not-configured";
  if (!supported) return "unsupported";
  if (iosNeedsInstall) return "ios-needs-install";
  if (permission === "denied") return "blocked";
  if (!pushEnabled) return "app-off";
  if (permission !== "granted") return "not-asked";
  if (!hasSubscription) return "needs-repair";
  if (serverHasEndpoint === false) return "needs-repair";

  return "ready";
}
