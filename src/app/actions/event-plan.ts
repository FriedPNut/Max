"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { loadEventPlan } from "@/lib/event-plan-data";
import {
  RIDE_SEATS_MAX,
  RIDE_SEATS_MIN,
  type EventPlanActionResult,
  type RideInput,
} from "@/lib/event-plan";

type ServerClient = Awaited<ReturnType<typeof createClient>>;

type AuthUser = {
  id: string;
  email?: string | null;
  user_metadata?: Record<string, unknown>;
};

async function requireUser() {
  if (!isSupabaseConfigured()) {
    redirect("/login");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return { supabase, user: user as AuthUser };
}

function userDisplayName(user: AuthUser) {
  const rawName = user.user_metadata?.display_name;

  if (typeof rawName === "string" && rawName.trim()) {
    return rawName.trim();
  }

  return user.email ? user.email.split("@")[0] : "friend";
}

function readText(value: unknown) {
  return String(value ?? "").trim();
}

function revalidateEvent(eventId: string) {
  revalidatePath(`/events/${eventId}`);
}

async function snapshotFor(
  supabase: ServerClient,
  eventId: string,
  user: AuthUser
): Promise<EventPlanActionResult> {
  const snapshot = await loadEventPlan(supabase, {
    eventId,
    currentUserId: user.id,
    currentUserName: userDisplayName(user),
  });

  if (snapshot.error) {
    return { error: snapshot.error };
  }

  return { snapshot };
}

function readRideInput(input: RideInput):
  | {
      seats: number;
      departingFrom: string;
      departAt: string | null;
      notes: string | null;
    }
  | { error: string } {
  const value = input ?? ({} as RideInput);
  const seats = Number(value.seats);
  const departingFrom = readText(value.departingFrom);
  const notes = readText(value.notes) || null;

  if (
    !Number.isInteger(seats) ||
    seats < RIDE_SEATS_MIN ||
    seats > RIDE_SEATS_MAX
  ) {
    return { error: "Use 1 to 12 seats." };
  }

  if (!departingFrom) {
    return { error: "Add where you're leaving from." };
  }

  let departAt: string | null = null;
  const rawDepartAt = readText(value.departAt);

  if (rawDepartAt) {
    const date = new Date(rawDepartAt);

    if (Number.isNaN(date.getTime())) {
      return { error: "That departure time doesn't look right." };
    }

    departAt = date.toISOString();
  }

  return { seats, departingFrom, departAt, notes };
}

function joinErrorMessage(error: { code?: string; message?: string } | null) {
  const message = error?.message?.trim() ?? "";

  if (error?.code === "P0001" && message) {
    return message;
  }

  if (/full/i.test(message)) {
    return "That ride is full.";
  }

  if (/already|one (ride|car)|another (ride|car)/i.test(message)) {
    return "You're already in a car for this event.";
  }

  if (error?.code === "23505") {
    return "You're already in this ride.";
  }

  return "Couldn't join that ride. Try again.";
}

export async function addEventItemAction(
  eventId: string,
  label: string
): Promise<EventPlanActionResult> {
  const id = readText(eventId);
  const cleanLabel = readText(label);

  if (!id) {
    return { error: "Couldn't find that event. Refresh and try again." };
  }

  if (!cleanLabel) {
    return { error: "Add an item first." };
  }

  const { supabase, user } = await requireUser();
  const { error } = await supabase
    .from("event_items")
    .insert({
      event_id: id,
      label: cleanLabel,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (error) {
    return { error: "Couldn't add that item. Try again." };
  }

  revalidateEvent(id);
  return snapshotFor(supabase, id, user);
}

export async function claimEventItemAction(
  eventId: string,
  itemId: string
): Promise<EventPlanActionResult> {
  const id = readText(eventId);
  const item = readText(itemId);

  if (!id || !item) {
    return { error: "Couldn't find that item. Refresh and try again." };
  }

  const { supabase, user } = await requireUser();
  const { data, error } = await supabase
    .from("event_items")
    .update({ claimed_by: user.id })
    .eq("id", item)
    .eq("event_id", id)
    .is("claimed_by", null)
    .select("id");

  if (error) {
    return { error: "Couldn't claim that item. Try again." };
  }

  revalidateEvent(id);

  if (!data || data.length === 0) {
    const refreshed = await snapshotFor(supabase, id, user);
    return {
      error: "That item is already claimed.",
      snapshot: refreshed.snapshot,
    };
  }

  return snapshotFor(supabase, id, user);
}

export async function unclaimEventItemAction(
  eventId: string,
  itemId: string
): Promise<EventPlanActionResult> {
  const id = readText(eventId);
  const item = readText(itemId);

  if (!id || !item) {
    return { error: "Couldn't find that item. Refresh and try again." };
  }

  const { supabase, user } = await requireUser();
  const { data, error } = await supabase
    .from("event_items")
    .update({ claimed_by: null })
    .eq("id", item)
    .eq("event_id", id)
    .eq("claimed_by", user.id)
    .select("id");

  if (error || !data || data.length === 0) {
    return { error: "That item isn't yours to unclaim." };
  }

  revalidateEvent(id);
  return snapshotFor(supabase, id, user);
}

export async function deleteEventItemAction(
  eventId: string,
  itemId: string
): Promise<EventPlanActionResult> {
  const id = readText(eventId);
  const item = readText(itemId);

  if (!id || !item) {
    return { error: "Couldn't find that item. Refresh and try again." };
  }

  const { supabase, user } = await requireUser();
  const { data: itemRow, error: itemError } = await supabase
    .from("event_items")
    .select("id,event_id,created_by")
    .eq("id", item)
    .maybeSingle();

  if (itemError) {
    return { error: "Couldn't delete that item. Try again." };
  }

  if (!itemRow || itemRow.event_id !== id) {
    return { error: "Couldn't find that item. Refresh and try again." };
  }

  const { data: eventRow, error: eventError } = await supabase
    .from("events")
    .select("created_by")
    .eq("id", id)
    .maybeSingle();

  if (eventError || !eventRow) {
    return { error: "Couldn't find that event. Refresh and try again." };
  }

  if (itemRow.created_by !== user.id && eventRow.created_by !== user.id) {
    return { error: "This item isn't yours to delete." };
  }

  const { data, error } = await supabase
    .from("event_items")
    .delete()
    .eq("id", item)
    .eq("event_id", id)
    .select("id");

  if (error || !data || data.length === 0) {
    return { error: "Couldn't delete that item. Try again." };
  }

  revalidateEvent(id);
  return snapshotFor(supabase, id, user);
}

export async function createEventRideAction(
  eventId: string,
  input: RideInput
): Promise<EventPlanActionResult> {
  const id = readText(eventId);
  const parsed = readRideInput(input);

  if (!id) {
    return { error: "Couldn't find that event. Refresh and try again." };
  }

  if ("error" in parsed) {
    return parsed;
  }

  const { supabase, user } = await requireUser();
  const { data: eventRides, error: ridesError } = await supabase
    .from("rides")
    .select("id,driver_id")
    .eq("event_id", id);

  if (ridesError) {
    return { error: "Couldn't check the rides. Try again." };
  }

  const rides = eventRides ?? [];
  const rideIds = rides.map((ride) => ride.id as string);

  if (rides.some((ride) => ride.driver_id === user.id)) {
    return { error: "You're already driving a car for this event." };
  }

  if (rideIds.length > 0) {
    const { data: passengerRows, error: passengerError } = await supabase
      .from("ride_passengers")
      .select("ride_id")
      .eq("user_id", user.id)
      .in("ride_id", rideIds);

    if (passengerError) {
      return { error: "Couldn't check the rides. Try again." };
    }

    if (passengerRows && passengerRows.length > 0) {
      return { error: "You're already in a car for this event." };
    }
  }

  const { error } = await supabase
    .from("rides")
    .insert({
      event_id: id,
      driver_id: user.id,
      seats: parsed.seats,
      departing_from: parsed.departingFrom,
      depart_at: parsed.departAt,
      notes: parsed.notes,
    })
    .select("id")
    .single();

  if (error) {
    return { error: "Couldn't offer that ride. Try again." };
  }

  revalidateEvent(id);
  return snapshotFor(supabase, id, user);
}

export async function updateEventRideAction(
  eventId: string,
  rideId: string,
  input: RideInput
): Promise<EventPlanActionResult> {
  const id = readText(eventId);
  const ride = readText(rideId);
  const parsed = readRideInput(input);

  if (!id || !ride) {
    return { error: "Couldn't find that ride. Refresh and try again." };
  }

  if ("error" in parsed) {
    return parsed;
  }

  const { supabase, user } = await requireUser();
  const { data: rideRow, error: rideError } = await supabase
    .from("rides")
    .select("id,event_id,driver_id")
    .eq("id", ride)
    .eq("event_id", id)
    .maybeSingle();

  if (rideError) {
    return { error: "Couldn't save those changes. Try again." };
  }

  if (!rideRow || rideRow.event_id !== id) {
    return { error: "Couldn't find that ride. Refresh and try again." };
  }

  if (rideRow.driver_id !== user.id) {
    return { error: "This ride isn't yours to edit." };
  }

  const { data: passengers, error: passengerError } = await supabase
    .from("ride_passengers")
    .select("user_id")
    .eq("ride_id", ride);

  if (passengerError) {
    return { error: "Couldn't save those changes. Try again." };
  }

  const passengerCount = passengers?.length ?? 0;

  if (parsed.seats < passengerCount) {
    return {
      error: `You already have ${passengerCount} ${
        passengerCount === 1 ? "passenger" : "passengers"
      }.`,
    };
  }

  const { data, error } = await supabase
    .from("rides")
    .update({
      seats: parsed.seats,
      departing_from: parsed.departingFrom,
      depart_at: parsed.departAt,
      notes: parsed.notes,
    })
    .eq("id", ride)
    .eq("driver_id", user.id)
    .select("id");

  if (error || !data || data.length === 0) {
    return { error: "Couldn't save those changes. Try again." };
  }

  revalidateEvent(id);
  return snapshotFor(supabase, id, user);
}

export async function deleteEventRideAction(
  eventId: string,
  rideId: string
): Promise<EventPlanActionResult> {
  const id = readText(eventId);
  const ride = readText(rideId);

  if (!id || !ride) {
    return { error: "Couldn't find that ride. Refresh and try again." };
  }

  const { supabase, user } = await requireUser();
  const { data, error } = await supabase
    .from("rides")
    .delete()
    .eq("id", ride)
    .eq("event_id", id)
    .eq("driver_id", user.id)
    .select("id");

  if (error) {
    return { error: "Couldn't delete that ride. Try again." };
  }

  if (!data || data.length === 0) {
    return { error: "This ride isn't yours to delete." };
  }

  revalidateEvent(id);
  return snapshotFor(supabase, id, user);
}

export async function joinEventRideAction(
  eventId: string,
  rideId: string
): Promise<EventPlanActionResult> {
  const id = readText(eventId);
  const ride = readText(rideId);

  if (!id || !ride) {
    return { error: "Couldn't find that ride. Refresh and try again." };
  }

  const { supabase, user } = await requireUser();
  const { data: rideRow, error: rideError } = await supabase
    .from("rides")
    .select("id,event_id,driver_id,seats")
    .eq("id", ride)
    .eq("event_id", id)
    .maybeSingle();

  if (rideError) {
    return { error: "Couldn't join that ride. Try again." };
  }

  if (!rideRow || rideRow.event_id !== id) {
    return { error: "Couldn't find that ride. Refresh and try again." };
  }

  if (rideRow.driver_id === user.id) {
    return { error: "You're driving this ride." };
  }

  const { data: eventRides, error: ridesError } = await supabase
    .from("rides")
    .select("id,driver_id")
    .eq("event_id", id);

  if (ridesError) {
    return { error: "Couldn't join that ride. Try again." };
  }

  const rides = eventRides ?? [];
  const rideIds = rides.map((eventRide) => eventRide.id as string);

  if (rides.some((eventRide) => eventRide.driver_id === user.id)) {
    return { error: "You're already driving a car for this event." };
  }

  if (rideIds.length > 0) {
    const { data: existing, error: existingError } = await supabase
      .from("ride_passengers")
      .select("ride_id")
      .eq("user_id", user.id)
      .in("ride_id", rideIds)
      .maybeSingle();

    if (existingError) {
      return { error: "Couldn't join that ride. Try again." };
    }

    if (existing) {
      return {
        error:
          existing.ride_id === ride
            ? "You're already in this ride."
            : "You're already in a car for this event.",
      };
    }
  }

  const { data: passengers, error: passengerError } = await supabase
    .from("ride_passengers")
    .select("user_id")
    .eq("ride_id", ride);

  if (passengerError) {
    return { error: "Couldn't join that ride. Try again." };
  }

  if ((passengers?.length ?? 0) >= Number(rideRow.seats)) {
    const refreshed = await snapshotFor(supabase, id, user);
    return { error: "That ride is full.", snapshot: refreshed.snapshot };
  }

  const { error } = await supabase.from("ride_passengers").insert({
    ride_id: ride,
    user_id: user.id,
  });

  if (error) {
    const refreshed = await snapshotFor(supabase, id, user);
    return {
      error: joinErrorMessage(error),
      snapshot: refreshed.snapshot,
    };
  }

  revalidateEvent(id);
  return snapshotFor(supabase, id, user);
}

export async function leaveEventRideAction(
  eventId: string,
  rideId: string
): Promise<EventPlanActionResult> {
  const id = readText(eventId);
  const ride = readText(rideId);

  if (!id || !ride) {
    return { error: "Couldn't find that ride. Refresh and try again." };
  }

  const { supabase, user } = await requireUser();
  const { data: rideRow, error: rideError } = await supabase
    .from("rides")
    .select("id,event_id")
    .eq("id", ride)
    .eq("event_id", id)
    .maybeSingle();

  if (rideError) {
    return { error: "Couldn't leave that ride. Try again." };
  }

  if (!rideRow || rideRow.event_id !== id) {
    return { error: "Couldn't find that ride. Refresh and try again." };
  }

  const { data, error } = await supabase
    .from("ride_passengers")
    .delete()
    .eq("ride_id", ride)
    .eq("user_id", user.id)
    .select("ride_id");

  if (error || !data || data.length === 0) {
    return { error: "You're not in that ride." };
  }

  revalidateEvent(id);
  return snapshotFor(supabase, id, user);
}

export async function removeEventRidePassengerAction(
  eventId: string,
  rideId: string,
  passengerId: string
): Promise<EventPlanActionResult> {
  const id = readText(eventId);
  const ride = readText(rideId);
  const passenger = readText(passengerId);

  if (!id || !ride || !passenger) {
    return { error: "Couldn't find that passenger. Refresh and try again." };
  }

  const { supabase, user } = await requireUser();
  const { data: rideRow, error: rideError } = await supabase
    .from("rides")
    .select("id,event_id,driver_id")
    .eq("id", ride)
    .eq("event_id", id)
    .maybeSingle();

  if (rideError) {
    return { error: "Couldn't remove that passenger. Try again." };
  }

  if (!rideRow || rideRow.event_id !== id) {
    return { error: "Couldn't find that ride. Refresh and try again." };
  }

  if (rideRow.driver_id !== user.id) {
    return { error: "Only the driver can remove passengers." };
  }

  const { data, error } = await supabase
    .from("ride_passengers")
    .delete()
    .eq("ride_id", ride)
    .eq("user_id", passenger)
    .select("ride_id");

  if (error || !data || data.length === 0) {
    return { error: "That person isn't in this ride." };
  }

  revalidateEvent(id);
  return snapshotFor(supabase, id, user);
}
