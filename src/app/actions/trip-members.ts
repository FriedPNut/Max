"use server";

import { requireTripUser } from "@/app/actions/trips";
import type { TripActionResult } from "@/app/actions/trips";

export async function addTripMemberAction(
  tripId: string,
  friendId: string
): Promise<TripActionResult> {
  const { supabase, user } = await requireTripUser();

  const { data: trip } = await supabase
    .from("trips")
    .select("id,created_by")
    .eq("id", tripId)
    .maybeSingle();

  if (!trip || trip.created_by !== user.id) {
    return { error: "Only the trip's creator can add people." };
  }

  const { data: friendship } = await supabase
    .from("friendships")
    .select("id")
    .eq("status", "accepted")
    .or(
      `and(requester_id.eq.${user.id},addressee_id.eq.${friendId}),and(requester_id.eq.${friendId},addressee_id.eq.${user.id})`
    )
    .limit(1)
    .maybeSingle();

  if (!friendship) {
    return { error: "You can only add friends." };
  }

  const { error } = await supabase
    .from("trip_members")
    .insert({ trip_id: tripId, user_id: friendId });

  if (error && error.code !== "23505") {
    return { error: "Couldn't add that person. Try again." };
  }

  return {};
}

export async function removeTripMemberAction(
  tripId: string,
  memberId: string
): Promise<TripActionResult> {
  const { supabase, user } = await requireTripUser();

  const { data: trip } = await supabase
    .from("trips")
    .select("id,created_by")
    .eq("id", tripId)
    .maybeSingle();

  if (!trip || trip.created_by !== user.id) {
    return { error: "Only the trip's creator can remove people." };
  }

  if (memberId === user.id) {
    return { error: "Use Leave trip to step out." };
  }

  const { error } = await supabase
    .from("trip_members")
    .delete()
    .eq("trip_id", tripId)
    .eq("user_id", memberId);

  if (error) {
    return { error: "Couldn't remove that person. Try again." };
  }

  return {};
}

export async function leaveTripAction(tripId: string): Promise<TripActionResult> {
  const { supabase, user } = await requireTripUser();

  const { data: trip } = await supabase
    .from("trips")
    .select("id,created_by")
    .eq("id", tripId)
    .maybeSingle();

  if (trip?.created_by === user.id) {
    return { error: "The creator can't leave. Delete the trip instead." };
  }

  const { data, error } = await supabase
    .from("trip_members")
    .delete()
    .eq("trip_id", tripId)
    .eq("user_id", user.id)
    .select("trip_id");

  if (error) {
    return { error: "Couldn't leave that trip. Try again." };
  }

  if (!data || data.length === 0) {
    return { error: "You're not in this trip anymore." };
  }

  return {};
}
