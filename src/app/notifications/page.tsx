import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AppShell, getAuthenticatedUser } from "@/components/app-shell";
import { NotificationList } from "@/components/notifications/notification-list";
import { NotificationSetupBanner } from "@/components/notifications/notification-setup-banner";
import { createClient } from "@/lib/supabase/server";
import type { NotificationRecord } from "@/lib/notifications";

export default async function NotificationsPage() {
  const { user } = await getAuthenticatedUser();
  const supabase = await createClient();
  const [notificationsResult, preferencesResult] = await Promise.all([
    supabase
      .from("notifications")
      .select("id,user_id,type,title,body,url,data,created_at,read_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(100),
    supabase
      .from("notification_preferences")
      .select("timezone")
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);
  const items = (notificationsResult.data ?? []) as NotificationRecord[];
  const timezone = (preferencesResult.data?.timezone as string | null) || "UTC";

  return (
    <AppShell userId={user.id}>
      <section className="space-y-6">
        <header>
          <Link
            href="/events"
            aria-label="Back to events"
            className="-ml-2 inline-flex h-11 w-11 items-center justify-center rounded-full text-text transition-colors duration-200 ease-out hover:bg-surface-2"
          >
            <ArrowLeft size={24} strokeWidth={1.75} aria-hidden="true" />
          </Link>
          <h1 className="mt-4 text-[22px] font-bold leading-tight text-text">
            Notifications
          </h1>
        </header>

        <NotificationSetupBanner />

        {notificationsResult.error ? (
          <p className="text-sm text-muted">
            Couldn’t load notifications. Refresh and try again.
          </p>
        ) : (
          <NotificationList
            initialNotifications={items}
            timezone={timezone}
          />
        )}
      </section>
    </AppShell>
  );
}
