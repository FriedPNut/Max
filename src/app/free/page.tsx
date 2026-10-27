import Link from "next/link";
import { AppShell, getAuthenticatedUser } from "@/components/app-shell";
import { FreeView } from "@/components/free/free-view";
import { createClient } from "@/lib/supabase/server";
import type { AvailabilityRecord, AvailabilityWindow } from "@/lib/availability";
import { nameInitial } from "@/lib/chat";
import { serverNowIso } from "@/lib/server-now";

type ProfileRow = {
  id: string;
  display_name: string | null;
  username: string | null;
};

export default async function FreePage() {
  const { user, displayName } = await getAuthenticatedUser();
  const supabase = await createClient();
  const nowIso = await serverNowIso();

  const { data: windowData, error: windowError } = await supabase
    .from("availability")
    .select("id,user_id,starts_at,ends_at,note")
    .gt("ends_at", nowIso)
    .order("starts_at", { ascending: true })
    .limit(200);

  const records = (windowData ?? []) as AvailabilityRecord[];
  const userIds = [...new Set(records.map((row) => row.user_id))];
  let profiles: ProfileRow[] = [];

  if (userIds.length > 0) {
    const { data } = await supabase
      .from("profiles")
      .select("id,display_name,username")
      .in("id", userIds);

    profiles = (data ?? []) as ProfileRow[];
  }

  const profilesById = new Map(profiles.map((profile) => [profile.id, profile]));

  const windows: AvailabilityWindow[] = records.map((row) => {
    const profile = profilesById.get(row.user_id);
    const name =
      row.user_id === user.id
        ? displayName
        : profile?.display_name?.trim() ||
          profile?.username?.trim() ||
          "A friend";

    return {
      ...row,
      name,
      initial: nameInitial(name),
      isMine: row.user_id === user.id,
    };
  });

  return (
    <AppShell userId={user.id} title="Who's free">
      <section className="space-y-8">

        {windowError ? (
          <p className="text-sm text-muted">
            Couldn&apos;t load availability. Refresh and try again.
          </p>
        ) : (
          <FreeView initialWindows={windows} userId={user.id} />
        )}
      </section>
    </AppShell>
  );
}
