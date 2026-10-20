import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AppShell, getAuthenticatedUser } from "@/components/app-shell";
import { NotificationList } from "@/components/notifications/notification-list";
import { createClient } from "@/lib/supabase/server";
import type { NotificationRecord } from "@/lib/notifications";

export default async function NotificationsPage() {
  const { user } = await getAuthenticatedUser();
  const supabase = await createClient();
  const [notificationsResult, preferencesResult] = await Promise.all([
    supabase.from("notifications").select("id,user_id,type,title,body,url,data,created_at,read_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(100),
    supabase.from("notification_preferences").select("timezone").eq("user_id", user.id).maybeSingle(),
  ]);
  const items = (notificationsResult.data ?? []) as NotificationRecord[];
  const timezone = (preferencesResult.data?.timezone as string | null) || "UTC";

  return <AppShell userId={user.id}>
    <section className="space-y-8">
      <header>
        <Link href="/events" className="mb-6 inline-flex min-h-11 items-center gap-1.5 text-sm text-muted transition-colors duration-150 hover:text-text"><ArrowLeft size={20} strokeWidth={1.5} aria-hidden="true" />Events</Link>
        <h1 className="text-[28px] font-semibold leading-tight text-text">Notifications</h1>
      </header>
      {notificationsResult.error ? <p className="text-sm text-muted">Couldn’t load notifications. Refresh and try again.</p> : <NotificationList initialNotifications={items} timezone={timezone} />}
    </section>
  </AppShell>;
}
