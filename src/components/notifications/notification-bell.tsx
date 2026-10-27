"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { HeartIcon } from "@/components/icons";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";

/** Heart entry to /notifications with a red badge for the unread count. */
export function NotificationBell({ userId }: { userId: string }) {
  const supabase = useMemo(() => createClient(), []);
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    let alive = true;
    const refresh = () =>
      supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .is("read_at", null)
        .then(({ count }) => {
          if (alive) setUnread(count ?? 0);
        });

    void refresh();
    const channel = supabase
      .channel(`notifications-unread-${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
        () => {
          void refresh();
        }
      )
      .subscribe();

    return () => {
      alive = false;
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
