import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AppShell, getAuthenticatedUser } from "@/components/app-shell";
import { NotificationSettings } from "@/components/notifications/notification-settings";
import { createClient } from "@/lib/supabase/server";

export default async function NotificationSettingsPage() {
  const { user } = await getAuthenticatedUser();
  const supabase = await createClient();
  const { data } = await supabase
    .from("notification_preferences")
    .select(
      "push_enabled,push_reminders,push_new_events,push_friends,push_chat,push_hangs,push_social,push_birthdays,push_recaps,timezone"
    )
    .eq("user_id", user.id)
    .maybeSingle();

  return (
    <AppShell userId={user.id}>
      <section className="space-y-6">
        <header>
          <Link
            href="/settings"
            aria-label="Back to settings"
            className="-ml-2 inline-flex h-11 w-11 items-center justify-center rounded-full text-text transition-colors duration-200 ease-out hover:bg-surface-2"
          >
            <ArrowLeft size={24} strokeWidth={1.75} aria-hidden="true" />
          </Link>
          <h1 className="mt-4 text-[22px] font-bold leading-tight text-text">
            Notifications
          </h1>
        </header>
        <NotificationSettings initialPreferences={data ?? null} />
      </section>
    </AppShell>
  );
}
