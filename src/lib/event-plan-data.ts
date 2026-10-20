import type { createClient } from "@/lib/supabase/server";
import type {
  EventItem,
  EventPlanSnapshot,
  EventRide,
  PlanPerson,
} from "@/lib/event-plan";

type ServerClient = Awaited<ReturnType<typeof createClient>>;

type ItemRow = {
  id: string;
  event_id: string;
  label: string;
  created_by: string;
  claimed_by: string | null;
  created_at: string;
};

type RideRow = {
  id: string;
  event_id: string;
  driver_id: string;
  seats: number;
  departing_from: string;
  depart_at: string | null;
  notes: string | null;
  created_at: string;
};

type PassengerRow = {
  ride_id: string;
  user_id: string;
};

type ProfileRow = {
  id: string;
  display_name: string | null;
  username: string | null;
};

export async function loadEventPlan(
  supabase: ServerClient,
  {
    eventId,
    currentUserId,
    currentUserName,
  }: {
    eventId: string;
    currentUserId: string;
    currentUserName: string;
  }
): Promise<EventPlanSnapshot> {
  const [itemsResult, ridesResult] = await Promise.all([
    supabase
      .from("event_items")
      .select("id,event_id,label,created_by,claimed_by,created_at")
      .eq("event_id", eventId)
      .order("created_at", { ascending: true }),
    supabase
      .from("rides")
      .select(
        "id,event_id,driver_id,seats,departing_from,depart_at,notes,created_at"
      )
      .eq("event_id", eventId)
      .order("created_at", { ascending: true }),
  ]);

  if (itemsResult.error || ridesResult.error) {
    return {
      items: [],
      rides: [],
      error: "Couldn't load the plan. Refresh and try again.",
    };
  }

  const itemRows = (itemsResult.data ?? []) as ItemRow[];
  const rideRows = (ridesResult.data ?? []) as RideRow[];
  const rideIds = rideRows.map((ride) => ride.id);
  let passengerRows: PassengerRow[] = [];

  if (rideIds.length > 0) {
    const { data, error } = await supabase
      .from("ride_passengers")
      .select("ride_id,user_id")
      .in("ride_id", rideIds);

    if (error) {
      return {
        items: [],
        rides: [],
        error: "Couldn't load the plan. Refresh and try again.",
      };
    }

    passengerRows = (data ?? []) as PassengerRow[];
  }

  const userIds = new Set<string>([currentUserId]);

  for (const item of itemRows) {
    if (item.claimed_by) {
      userIds.add(item.claimed_by);
    }
  }

  for (const ride of rideRows) {
    userIds.add(ride.driver_id);
  }

  for (const passenger of passengerRows) {
    userIds.add(passenger.user_id);
  }

  let profileRows: ProfileRow[] = [];

  if (userIds.size > 0) {
    const { data } = await supabase
      .from("profiles")
      .select("id,display_name,username")
      .in("id", [...userIds]);

    profileRows = (data ?? []) as ProfileRow[];
  }

  const profilesById = new Map(
    profileRows.map((profile) => [profile.id, profile])
  );

  function person(id: string): PlanPerson {
    const profile = profilesById.get(id);
    const username = profile?.username?.trim() || null;
    const name =
      profile?.display_name?.trim() ||
      username ||
      (id === currentUserId ? currentUserName : "A friend");

    return { id, name, username };
  }

  const passengersByRide = new Map<string, PlanPerson[]>();

  for (const row of passengerRows) {
    const current = passengersByRide.get(row.ride_id) ?? [];
    current.push(person(row.user_id));
    passengersByRide.set(row.ride_id, current);
  }

  for (const passengers of passengersByRide.values()) {
    passengers.sort((a, b) => a.name.localeCompare(b.name));
  }

  const items: EventItem[] = itemRows.map((row) => ({
    id: row.id,
    label: row.label,
    createdBy: row.created_by,
    createdAt: row.created_at,
    claimedBy: row.claimed_by,
    claimer: row.claimed_by ? person(row.claimed_by) : null,
  }));

  const rides: EventRide[] = rideRows.map((row) => ({
    id: row.id,
    driverId: row.driver_id,
    driver: person(row.driver_id),
    seats: Number(row.seats),
    departingFrom: row.departing_from,
    departAt: row.depart_at,
    notes: row.notes,
    createdAt: row.created_at,
    passengers: passengersByRide.get(row.id) ?? [],
  }));

  return { items, rides };
}
