import Link from "next/link";
import { AppShell, getAuthenticatedUser } from "@/components/app-shell";
import { HangView, type HangCard } from "@/components/hang/hang-view";
import { createClient } from "@/lib/supabase/server";
import type { HangRecord, HangResponseRecord } from "@/lib/hangs";
import { serverNowIso } from "@/lib/server-now";

type ProfileRow = {
  id: string;
  display_name: string | null;
  username: string | null;
};

export default async function HangPage() {
  const { user, displayName } = await getAuthenticatedUser();
  const supabase = await createClient();
  const nowIso = await serverNowIso();

  const { data: hangData, error: hangError } = await supabase
    .from("hangs")
    .select("id,created_by,message,location,expires_at,created_at")
    .gt("expires_at", nowIso)
    .order("created_at", { ascending: false })
    .limit(50);

  const hangs = (hangData ?? []) as HangRecord[];
  const hangIds = hangs.map((hang) => hang.id);
  let responses: HangResponseRecord[] = [];

  if (hangIds.length > 0) {
    const { data } = await supabase
      .from("hang_responses")
      .select("hang_id,user_id,response")
      .in("hang_id", hangIds);

    responses = (data ?? []) as HangResponseRecord[];
  }

  const personIds = [
    ...new Set([
      ...hangs.map((hang) => hang.created_by),
      ...responses.map((row) => row.user_id),
    ]),
  ];
  let profiles: ProfileRow[] = [];

  if (personIds.length > 0) {
    const { data } = await supabase
      .from("profiles")
      .select("id,display_name,username")
      .in("id", personIds);

    profiles = (data ?? []) as ProfileRow[];
  }

  const nameById = new Map<string, string>();

  for (const profile of profiles) {
    nameById.set(
      profile.id,
      profile.display_name?.trim() || profile.username?.trim() || "A friend"
    );
  }

  nameById.set(user.id, displayName);

  const cards: HangCard[] = hangs.map((hang) => ({
    id: hang.id,
    message: hang.message,
    location: hang.location,
    expiresAt: hang.expires_at,
    createdBy: hang.created_by,
    creatorName: nameById.get(hang.created_by) ?? "A friend",
    isMine: hang.created_by === user.id,
    myResponse:
      responses.find(
        (row) => row.hang_id === hang.id && row.user_id === user.id
      )?.response ?? null,
    people: responses
      .filter((row) => row.hang_id === hang.id && row.response === "in")
      .map((row) => nameById.get(row.user_id) ?? "A friend"),
    laterPeople: responses
      .filter((row) => row.hang_id === hang.id && row.response === "later")
      .map((row) => nameById.get(row.user_id) ?? "A friend"),
  }));

  return (
    <AppShell userId={user.id} title="Hang now">
      <section className="space-y-8">

        {hangError ? (
          <p className="text-sm text-muted">
            Couldn&apos;t load hangs. Refresh and try again.
          </p>
        ) : (
          <HangView initialHangs={cards} userId={user.id} />
        )}
      </section>
    </AppShell>
  );
}
