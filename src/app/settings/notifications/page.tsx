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
    .select("push_enabled,push_reminders,push_new_events,push_friends,push_chat,timezone")
    .eq("user_id", user.id)
    .maybeSingle();

  return (
    <AppShell userId={user.id}>
      <section className="space-y-8">
        <header>
          <Link href="/me" className="mb-6 inline-flex min-h-11 items-center gap-1.5 text-sm text-muted transition-colors duration-150 hover:text-text">
            <ArrowLeft size={20} strokeWidth={1.5} aria-hidden="true" />Profile
          </Link>
          <h1 className="text-[28px] font-semibold leading-tight text-text">Notifications</h1>
        </header>
        <NotificationSettings initialPreferences={data ?? null} />
      </section>
    </AppShell>
  );
}
