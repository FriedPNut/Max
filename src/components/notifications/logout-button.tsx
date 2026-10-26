"use client";

import { useState } from "react";
import { signOutAction, removeCurrentPushSubscriptionAction } from "@/app/actions/auth";
import { disablePush } from "@/lib/push-client";

export function LogoutButton() {
  const [pending, setPending] = useState(false);

  async function handleClick() {
    if (pending) return;
    setPending(true);
    if (!("serviceWorker" in navigator)) {
      await signOutAction();
      return;
    }
    try {
      const registration = await navigator.serviceWorker.getRegistration("/");
      const subscription = await registration?.pushManager.getSubscription();
      if (subscription) {
        const endpoint = subscription.endpoint;
        const result = await removeCurrentPushSubscriptionAction(endpoint);
        if (result.error) {
          setPending(false);
          return;
        }
        await subscription.unsubscribe();
      }
    } catch {
      const result = await disablePush();
      if (result.error) {
        setPending(false);
        return;
      }
    }
    await signOutAction();
  }

  return <button
    type="button"
    role="menuitem"
    onClick={() => void handleClick()}
    disabled={pending}
    className="flex min-h-11 w-full items-center px-3 text-left text-base text-text transition-colors duration-200 ease-out hover:bg-surface-2 disabled:opacity-40"
  >
    {pending ? "Logging out..." : "Log out"}
  </button>;
}
