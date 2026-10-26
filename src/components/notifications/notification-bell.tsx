"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { BellIcon } from "@/components/icons";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";

export function NotificationBell({ userId }: { userId: string }) {
  const supabase = useMemo(() => createClient(), []);
  const [unread, setUnread] = useState(false);

  useEffect(() => {
    let alive = true;
    void supabase.from("notifications").select("id", { count: "exact", head: true }).eq("user_id", userId).is("read_at", null)
      .then(({ count }) => { if (alive) setUnread((count ?? 0) > 0); });
    const channel = supabase
      .channel(`notifications-unread-${userId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` }, (payload) => {
        if (payload.eventType === "DELETE") {
          void supabase.from("notifications").select("id", { count: "exact", head: true }).eq("user_id", userId).is("read_at", null)
            .then(({ count }) => setUnread((count ?? 0) > 0));
          return;
        }
        const row = payload.new as { read_at?: string | null };
        if (!row.read_at) setUnread(true);
        else void supabase.from("notifications").select("id", { count: "exact", head: true }).eq("user_id", userId).is("read_at", null)
          .then(({ count }) => setUnread((count ?? 0) > 0));
      })
      .subscribe();
    return () => { alive = false; void supabase.removeChannel(channel); };
  }, [supabase, userId]);

  return <Link href="/notifications" aria-label={unread ? "Notifications, unread" : "Notifications"} className="relative inline-flex h-11 w-11 items-center justify-center rounded-full text-text transition-colors duration-200 hover:bg-surface-2">
    <BellIcon size={24} strokeWidth={1.75} aria-hidden="true" />
    {unread && <Badge dot label="Unread notifications" className="absolute right-2 top-2" />}
  </Link>;
}
