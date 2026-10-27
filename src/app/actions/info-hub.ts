"use server";

import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { nameInitial } from "@/lib/chat";
import { serverNow } from "@/lib/server-now";
import { dateKey, parseDateKey, type TripRecord } from "@/lib/trips";
import type { ListKind } from "@/lib/lists";

/*
 * The Info sheet is opened from the Events top bar, so nothing here is allowed
 * to run until the sheet actually asks for a tab. Each loader is one round of
 * reads against the tables the app already uses; the browser keeps the answer
 * for the rest of the session.
 */

export type InfoListRow = {
  id: string;
  title: string;
  kind: ListKind;
  openCount: number;
  creatorName: string;
};

export type InfoListsResult = { rows: InfoListRow[]; error?: string };

export type InfoTripRow = {
  id: string;
  title: string;
  destination: string | null;
  startDate: string;
  endDate: string;
  memberInitials: { id: string; initial: string }[];
};

export type InfoTripsResult = {
  upcoming: InfoTripRow[];
  past: InfoTripRow[];
  /** For the create-trip sheet's friend picker and cover path. */
  friends: { id: string; name: string }[];
  userId?: string;
  error?: string;
};

export type InfoBirthdayRow = {
  id: string;
  name: string;
  username: string | null;
  month: number;
  day: number;
};

export type InfoBirthdaysResult = {
  mine: { month: number; day: number; year: number | null } | null;
  friends: InfoBirthdayRow[];
  error?: string;
};

const SIGNED_OUT = "Sign in again to see this.";

async function requireUser() {
  if (!isSupabaseConfigured()) {
    return null;
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user ? { supabase, user } : null;
}

function friendIdsFrom(
  rows: { requester_id: string; addressee_id: string }[] | null,
  userId: string
) {
  return [
    ...new Set(
      (rows ?? []).map((row) =>
        row.requester_id === userId ? row.addressee_id : row.requester_id
      )
    ),
  ];
}

function profileName(profile: {
  display_name: string | null;
  username: string | null;
}) {
  return profile.display_name?.trim() || profile.username?.trim() || "A friend";
}

export async function loadInfoListsAction(): Promise<InfoListsResult> {
  const auth = await requireUser();

  if (!auth) {
    return { rows: [], error: SIGNED_OUT };
  }

  const { supabase, user } = auth;

  const { data: listData, error: listError } = await supabase
    .from("lists")
    .select("id,title,kind,created_by")
    .order("created_at", { ascending: false })
    .limit(100);

  if (listError) {
    return { rows: [], error: "Couldn't load lists." };
  }

  const lists = (listData ?? []) as {
    id: string;
    title: string;
    kind: ListKind;
    created_by: string;
  }[];
  const listIds = lists.map((list) => list.id);
  const creatorIds = [...new Set(lists.map((list) => list.created_by))];

  const [itemResult, profileResult] = await Promise.all([
    listIds.length > 0
      ? supabase
          .from("list_items")
          .select("list_id")
          .in("list_id", listIds)
          .eq("done", false)
      : Promise.resolve({ data: [], error: null }),
    creatorIds.length > 0
      ? supabase
          .from("profiles")
          .select("id,display_name,username")
          .in("id", creatorIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  const openCounts = new Map<string, number>();

  for (const row of (itemResult.data ?? []) as { list_id: string }[]) {
    openCounts.set(row.list_id, (openCounts.get(row.list_id) ?? 0) + 1);
  }

  const nameById = new Map<string, string>();

  for (const profile of (profileResult.data ?? []) as {
    id: string;
    display_name: string | null;
    username: string | null;
  }[]) {
    nameById.set(profile.id, profileName(profile));
  }

  return {
    rows: lists.map((list) => ({
      id: list.id,
      title: list.title,
      kind: list.kind,
      openCount: openCounts.get(list.id) ?? 0,
      creatorName:
        list.created_by === user.id
          ? "you"
          : nameById.get(list.created_by) ?? "A friend",
    })),
  };
}

export async function loadInfoTripsAction(): Promise<InfoTripsResult> {
  const empty: InfoTripsResult = { upcoming: [], past: [], friends: [] };
  const auth = await requireUser();

  if (!auth) {
    return { ...empty, error: SIGNED_OUT };
  }

  const { supabase, user } = auth;

  // My trips and my friendships are independent reads.
  const [{ data: memberRows, error: memberError }, { data: friendshipRows }] =
    await Promise.all([
      supabase.from("trip_members").select("trip_id").eq("user_id", user.id),
      supabase
        .from("friendships")
        .select("requester_id,addressee_id")
        .eq("status", "accepted")
        .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`),
    ]);

  const tripIds = ((memberRows ?? []) as { trip_id: string }[]).map(
    (row) => row.trip_id
  );
  const friendIds = friendIdsFrom(
    friendshipRows as { requester_id: string; addressee_id: string }[] | null,
    user.id
  );

  const [tripsResult, membersResult] = await Promise.all([
    tripIds.length > 0
      ? supabase
          .from("trips")
          .select(
            "id,title,destination,start_date,end_date,description,cover_path,created_by"
          )
          .in("id", tripIds)
          .limit(100)
      : Promise.resolve({ data: [], error: null }),
    tripIds.length > 0
      ? supabase
          .from("trip_members")
          .select("trip_id,user_id")
          .in("trip_id", tripIds)
          .limit(500)
      : Promise.resolve({ data: [], error: null }),
  ]);

  const trips = (tripsResult.data ?? []) as TripRecord[];
  const allMembers = (membersResult.data ?? []) as {
    trip_id: string;
    user_id: string;
  }[];
  const profileIds = [
    ...new Set([...allMembers.map((row) => row.user_id), ...friendIds]),
  ];

  const { data: profileData } =
    profileIds.length > 0
      ? await supabase
          .from("profiles")
          .select("id,display_name,username")
          .in("id", profileIds)
      : { data: [] };

  const profiles = (profileData ?? []) as {
    id: string;
    display_name: string | null;
    username: string | null;
  }[];
  const nameById = new Map(
    profiles.map((profile) => [profile.id, profileName(profile)])
  );

  const initialsByTrip = new Map<string, { id: string; initial: string }[]>();

  for (const row of allMembers) {
    const name = nameById.get(row.user_id) ?? "A friend";
    const list = initialsByTrip.get(row.trip_id) ?? [];
    list.push({ id: row.user_id, initial: nameInitial(name) });
    initialsByTrip.set(row.trip_id, list);
  }

  const rows: InfoTripRow[] = trips.map((trip) => ({
    id: trip.id,
    title: trip.title,
    destination: trip.destination,
    startDate: trip.start_date,
    endDate: trip.end_date,
    memberInitials: initialsByTrip.get(trip.id) ?? [],
  }));

  // "Past" is a whole calendar day on the server's clock, so a trip that ends
  // today is still upcoming.
  const today = parseDateKey(dateKey(new Date(await serverNow())));
  const todayTime = today?.getTime() ?? 0;
  const endTime = (row: InfoTripRow) =>
    parseDateKey(row.endDate)?.getTime() ?? 0;

  return {
    userId: user.id,
    upcoming: rows
      .filter((row) => endTime(row) >= todayTime)
      .sort((a, b) => a.startDate.localeCompare(b.startDate)),
    past: rows
      .filter((row) => endTime(row) < todayTime)
      .sort((a, b) => b.startDate.localeCompare(a.startDate)),
    friends: profiles
      .filter(
        (profile) =>
          friendIds.includes(profile.id) && profile.id !== user.id
      )
      .map((profile) => ({ id: profile.id, name: profileName(profile) }))
      .sort((a, b) => a.name.localeCompare(b.name)),
    error:
      memberError || tripsResult.error ? "Couldn't load trips." : undefined,
  };
}

export async function loadInfoBirthdaysAction(): Promise<InfoBirthdaysResult> {
  const auth = await requireUser();

  if (!auth) {
    return { mine: null, friends: [], error: SIGNED_OUT };
  }

  const { supabase, user } = auth;

  const [{ data: mineData, error: mineError }, { data: friendshipData }] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("birth_month,birth_day,birth_year")
        .eq("id", user.id)
        .maybeSingle(),
      supabase
        .from("friendships")
        .select("requester_id,addressee_id")
        .eq("status", "accepted")
        .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`),
    ]);

  const friendIds = friendIdsFrom(
    friendshipData as { requester_id: string; addressee_id: string }[] | null,
    user.id
  );

  const { data: profileData } =
    friendIds.length > 0
      ? await supabase
          .from("profiles")
          .select("id,display_name,username,birth_month,birth_day")
          .in("id", friendIds)
          .not("birth_month", "is", null)
          .not("birth_day", "is", null)
      : { data: [] };

  const mine = mineData as {
    birth_month: number | null;
    birth_day: number | null;
    birth_year: number | null;
  } | null;

  return {
    mine:
      mine?.birth_month != null && mine.birth_day != null
        ? {
            month: mine.birth_month,
            day: mine.birth_day,
            // Stored, never shown. It only survives a save so editing the day
            // doesn't wipe it.
            year: mine.birth_year ?? null,
          }
        : null,
    friends: (
      (profileData ?? []) as {
        id: string;
        display_name: string | null;
        username: string | null;
        birth_month: number | null;
        birth_day: number | null;
      }[]
    )
      .filter(
        (profile) => profile.birth_month != null && profile.birth_day != null
      )
      .map((profile) => ({
        id: profile.id,
        name: profileName(profile),
        username: profile.username?.trim() || null,
        month: profile.birth_month as number,
        day: profile.birth_day as number,
      })),
    error: mineError ? "Couldn't load birthdays." : undefined,
  };
}
