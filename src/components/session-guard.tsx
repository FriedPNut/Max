"use client";

import { useEffect } from "react";
import { clearClientData } from "@/lib/client-state";

/**
 * The user whose data this tab currently holds. Module memory, so a reload
 * starts clean and the first auth event never looks like a change.
 */
let knownUserId: string | null = null;

/**
 * Watches auth state for the whole app. A sign-out (including one from another
 * tab) or a different person signing in wipes every client cache and does a
 * full navigation, so no stale router entry or in-memory list can survive.
 *
 * Supabase and the push helper are imported after first paint: neither is
 * needed to render the shell, and keeping them out of the initial chunk saves
 * roughly 200 KB on every route.
 */
export function SessionGuard() {
  useEffect(() => {
    let leaving = false;
    let cancelled = false;
    let unsubscribe: (() => void) | undefined;

    void (async () => {
      const [{ createClient }, { disablePush }] = await Promise.all([
        import("@/lib/supabase/client"),
        import("@/lib/push-client"),
      ]);

      if (cancelled) return;

      const supabase = createClient();

      function leave(to: string, dropPush: boolean) {
        if (leaving) {
          return;
        }

        leaving = true;
        void supabase.removeAllChannels();
        clearClientData();

        if (dropPush) {
          void disablePush().catch(() => {});
        }

        if (window.location.pathname === to) {
          window.location.reload();
          return;
        }

        window.location.assign(to);
      }

      // Read the current session from the cookie, not the network.
      void supabase.auth.getSession().then(({ data }) => {
        if (!knownUserId && data.session?.user.id) {
          knownUserId = data.session.user.id;
        }
      });

      const { data } = supabase.auth.onAuthStateChange((event, session) => {
        const userId = session?.user?.id ?? null;

        if (event === "SIGNED_OUT" || !userId) {
          leave("/login", true);
          return;
        }

        if (knownUserId && knownUserId !== userId) {
          // Someone else signed in on this device.
          leave("/events", false);
          return;
        }

        knownUserId = userId;
      });

      unsubscribe = () => data.subscription.unsubscribe();
    })();

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, []);

  return null;
}
