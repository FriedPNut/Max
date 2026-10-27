import { FastLink } from "@/components/ui/fast-link";
import { AppShell, getAuthenticatedUser } from "@/components/app-shell";
import { NewTripButton } from "@/components/trips/new-trip-button";
import { TripCountdown } from "@/components/trips/trip-countdown";
import { Avatar } from "@/components/ui/avatar";
import { createClient } from "@/lib/supabase/server";
import { nameInitial } from "@/lib/chat";
import { dateKey, parseDateKey, type TripRecord } from "@/lib/trips";
import { serverNow } from "@/lib/server-now";

export default async function TripsPage() {
  const { user, displayName } = await getAuthenticatedUser();
  const supabase = await createClient();

  // Trips I'm on and my friendships are independent, so they load together.
  const [{ data: memberRows, error: memberError }, { data: friendshipRows }] =
    await Promise.all([
      supabase.from("trip_members").select("trip_id").eq("user_id", user.id),
      supabase
        .from("friendships")
        .select("requester_id,addressee_id")
        .eq("status", "accepted")
        .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`),
    ]);

  const tripIds = ((memberRows ?? []) as { trip_id: string }[]).map((row) => row.trip_id);
  let trips: TripRecord[] = [];
  let loadError = Boolean(memberError);

  // Trip rows and their member rows both only need tripIds.
  const [tripsResult, membersResult] = tripIds.length > 0
    ? await Promise.all([
        supabase
          .from("trips")
          .select("id,title,destination,start_date,end_date,description,cover_path,created_by")
          .in("id", tripIds)
          .limit(100),
        supabase
          .from("trip_members")
          .select("trip_id,user_id")
          .in("trip_id", tripIds)
          .limit(500),
      ])
    : [
        { data: [], error: null },
        { data: [], error: null },
      ];
  trips = (tripsResult.data ?? []) as TripRecord[];
  loadError = loadError || Boolean(tripsResult.error);
  const allMembers = membersResult.data;

  const memberUserIds = [...new Set(((allMembers ?? []) as { user_id: string }[]).map((m) => m.user_id))];
  const nameById = new Map<string, string>([[user.id, displayName]]);

  const friendIds = [
    ...new Set(
      ((friendshipRows ?? []) as { requester_id: string; addressee_id: string }[]).map((row) =>
        row.requester_id === user.id ? row.addressee_id : row.requester_id
      )
    ),
  ];

  // One profile query covers trip members and friends.
  const profileIds = [...new Set([...memberUserIds, ...friendIds])];
  const { data: profiles } = profileIds.length > 0
    ? await supabase.from("profiles").select("id,display_name,username").in("id", profileIds)
    : { data: [] };

  for (const profile of (profiles ?? []) as {
    id: string;
    display_name: string | null;
    username: string | null;
  }[]) {
    nameById.set(profile.id, profile.display_name?.trim() || profile.username?.trim() || "A friend");
  }

  // Keyed by person: the member list can change order or length.
  const initialsByTrip = new Map<string, { id: string; initial: string }[]>();

  for (const row of (allMembers ?? []) as { trip_id: string; user_id: string }[]) {
    const name = nameById.get(row.user_id) ?? "A friend";
    const list = initialsByTrip.get(row.trip_id) ?? [];
    list.push({ id: row.user_id, initial: nameInitial(name) });
    initialsByTrip.set(row.trip_id, list);
  }

  const friends = ((profiles ?? []) as { id: string; display_name: string | null; username: string | null }[])
    .filter((profile) => friendIds.includes(profile.id))
    .map((profile) => ({
      id: profile.id,
      name: profile.display_name?.trim() || profile.username?.trim() || "A friend",
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const today = parseDateKey(dateKey(new Date(await serverNow())));
  const upcoming = trips
    .filter((trip) => (parseDateKey(trip.end_date)?.getTime() ?? 0) >= (today?.getTime() ?? 0))
    .sort((a, b) => a.start_date.localeCompare(b.start_date));
  const past = trips
    .filter((trip) => (parseDateKey(trip.end_date)?.getTime() ?? 0) < (today?.getTime() ?? 0))
    .sort((a, b) => b.start_date.localeCompare(a.start_date));
  const ordered = [...upcoming, ...past];

  return (
    <AppShell userId={user.id} title="Trips">
      <section className="space-y-8">

        {loadError ? (
          <p className="text-sm text-muted">Couldn&apos;t load trips. Refresh and try again.</p>
        ) : ordered.length === 0 ? (
          <p className="text-sm text-muted">No trips yet. Tap + to plan one.</p>
        ) : (
          <ul className="border-t border-line">
            {ordered.map((trip) => {
              const isPast = past.includes(trip);
              return (
                <li key={trip.id} className="-mx-4 border-b border-line">
                  <FastLink href={`/trips/${trip.id}`} className="flex min-h-14 items-center justify-between gap-3 px-4 py-4 transition-colors duration-200 ease-out hover:bg-surface-2">
                    <div className="min-w-0">
                      <p className="truncate text-base font-semibold text-text">{trip.title}</p>
                      <p className="truncate text-sm text-muted">
                        {trip.destination ? `${trip.destination} · ` : ""}
                        {formatRange(trip.start_date, trip.end_date)}
                        {!isPast && (
                          <TripCountdown
                            startKey={trip.start_date}
                            endKey={trip.end_date}
                          />
                        )}
                      </p>
                    </div>
                    <span className="flex shrink-0" aria-label="Members">
                      {(initialsByTrip.get(trip.id) ?? []).slice(0, 4).map((member, index) => (
                        <Avatar
                          key={member.id}
                          initial={member.initial}
                          size={32}
                          className={index > 0 ? "-ml-2 ring-2 ring-background" : ""}
                        />
                      ))}
                    </span>
                  </FastLink>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <NewTripButton friends={friends} userId={user.id} />
    </AppShell>
  );
}

function formatRange(start: string, end: string) {
  const s = parseDateKey(start);
  const e = parseDateKey(end);

  if (!s || !e) {
    return "";
  }

  const fmt = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" });
  return start === end ? fmt.format(s) : `${fmt.format(s)} – ${fmt.format(e)}`;
}
