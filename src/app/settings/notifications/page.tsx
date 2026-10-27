import Link from "next/link";
import { AppShell, getAuthenticatedUser } from "@/components/app-shell";
import { NotificationSettings } from "@/components/notifications/notification-settings";
import { createClient } from "@/lib/supabase/server";

export default async function NotificationSettingsPage() {
  const { user } = await getAuthenticatedUser();
  const supabase = await createClient();
  const { data } = await supabase
    .from("notification_preferences")
    .select(        "push_enabled,push_reminders,push_new_events,push_friends,push_chat,push_hangs,push_social,push_posts,push_birthdays,push_recaps,timezone"
    )
    .eq("user_id", user.id)
    .maybeSingle();

  return (
    <AppShell userId={user.id} title="Notifications">
      <section className="space-y-6">
        <NotificationSettings initialPreferences={data ?? null} />
      </section>
    </AppShell>
  );
}
