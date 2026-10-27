import { AppShell, getAuthenticatedUser } from "@/components/app-shell";
import { NotificationList } from "@/components/notifications/notification-list";
import { NotificationSetupBanner } from "@/components/notifications/notification-setup-banner";
import { createClient } from "@/lib/supabase/server";
import { resolveProfileAvatarUrls } from "@/lib/profile-data";
import {
  notificationActorId,
  withNotificationActorProfiles,
  type NotificationRecord,
} from "@/lib/notifications";

/** Adds the actor's name, username and avatar so rows can open the profile. */
async function withActors(
  supabase: Awaited<ReturnType<typeof createClient>>,
  items: NotificationRecord[]
) {
  const ids = [
    ...new Set(
      items
        .map((item) => notificationActorId(item))
        .filter((id): id is string => Boolean(id))
    ),
  ];

  if (ids.length === 0) return items;

  const { data } = await supabase
    .from("profiles")
    .select("id,display_name,username,avatar_url")
    .in("id", ids);
  const profiles = (data ?? []) as {
    id: string;
    display_name: string | null;
    username: string | null;
    avatar_url: string | null;
  }[];

  if (profiles.length === 0) return items;

  const avatarUrls = await resolveProfileAvatarUrls(supabase, profiles);

  return withNotificationActorProfiles(
    items,
    profiles.map((profile) => ({
      ...profile,
      avatar_url: avatarUrls.get(profile.id) ?? profile.avatar_url,
    }))
  );
}

export default async function NotificationsPage() {
  const { user } = await getAuthenticatedUser();
  const supabase = await createClient();
  const notificationsResult = await supabase
    .from("notifications")
    .select("id,user_id,type,title,body,url,data,created_at,read_at")
    .eq("user_id", user.id)
    .is("read_at", null)
    .order("created_at", { ascending: false })
    .limit(100);

  const items = await withActors(
    supabase,
    (notificationsResult.data ?? []) as NotificationRecord[]
  );

  return (
    <AppShell userId={user.id} title="Notifications">
      <section className="space-y-6">
        <NotificationSetupBanner />

        {notificationsResult.error ? (
          <p className="text-sm text-muted">
            Couldn’t load notifications. Refresh and try again.
          </p>
        ) : (
          <NotificationList initialNotifications={items} userId={user.id} />
        )}
      </section>
    </AppShell>
  );
}
