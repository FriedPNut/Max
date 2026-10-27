"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { HeartIcon } from "@/components/icons";
import { Badge } from "@/components/ui/badge";
import { NOTIFICATIONS_CHANGED_EVENT } from "@/lib/notification-clear";
import {
  notificationRowCount,
  type NotificationLike,
} from "@/lib/notifications";
import { createClient } from "@/lib/supabase/client";

/** Heart entry to /notifications with a red badge for the rows still listed. */
export function NotificationBell({ userId }: { userId: string | null }) {
  const [unread, setUnread] = useState(0);
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    if (!userId) {
      return;
    }

    let alive = true;

    const refresh = async () => {
      const { data } = await supabase
        .from("notifications")
        .select("id,type,title,created_at,data")
        .eq("user_id", userId)
        .is("read_at", null)
        .limit(100);

      if (alive) {
        setUnread(notificationRowCount((data ?? []) as NotificationLike[]));
      }
    };

    void refresh();

    const channel = supabase
      .channel(`notifications-unread-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        () => {
          void refresh();
        }
      )
      .subscribe();

    // Clears made in this tab update the badge without a round trip.
    const onChanged = () => {
      void refresh();
    };
    window.addEventListener(NOTIFICATIONS_CHANGED_EVENT, onChanged);

    return () => {
      alive = false;
      window.removeEventListener(NOTIFICATIONS_CHANGED_EVENT, onChanged);
      void supabase.removeChannel(channel);
    };
  }, [supabase, userId]);

  return (
    <Link
      href="/notifications"
      aria-label={unread ? `Notifications, ${unread} unread` : "Notifications"}
      className="relative inline-flex h-11 w-11 items-center justify-center rounded-full text-text transition-colors duration-200 hover:bg-surface-2"
    >
      <HeartIcon size={24} strokeWidth={1.75} aria-hidden="true" />
      {unread > 0 ? (
        <Badge
          count={unread}
          className="absolute right-0.5 top-0.5 h-4 min-h-4 min-w-4 text-[10px]"
        />
      ) : null}
    </Link>
  );
}
