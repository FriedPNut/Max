"use server";

import { redirect } from "next/navigation";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import {
  TRIP_DESCRIPTION_MAX,
  TRIP_DESTINATION_MAX,
  TRIP_TITLE_MAX,
  parseDateKey,
} from "@/lib/trips";

export type TripActionResult = {
  error?: string;
  id?: string;
};

export async function requireTripUser() {
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

  return { supabase, user };
}

// Trip data is visible and editable only to members. RLS enforces this too;
// this check gives a plain error instead of an empty result.
export async function requireTripMember(
  supabase: Awaited<ReturnType<typeof createClient>>,
  tripId: string,
  userId: string
) {
  const { data } = await supabase
    .from("trip_members")
    .select("trip_id")
    .eq("trip_id", tripId)
    .eq("user_id", userId)
    .maybeSingle();

  return Boolean(data);
}

function validateTripFields(input: {
  title: string;
  destination: string;
  startDate: string;
  endDate: string;
  description: string;
}) {
  if (!input.title) return "Give the trip a name.";
  if (input.title.length > TRIP_TITLE_MAX) return `Keep the name under ${TRIP_TITLE_MAX} characters.`;
  if (input.destination.length > TRIP_DESTINATION_MAX) return `Keep the destination under ${TRIP_DESTINATION_MAX} characters.`;
  if (input.description.length > TRIP_DESCRIPTION_MAX) return `Keep the description under ${TRIP_DESCRIPTION_MAX} characters.`;

  const start = parseDateKey(input.startDate);
  const end = parseDateKey(input.endDate);

  if (!start || !end) return "Pick a start and end date.";
  if (end < start) return "The trip can't end before it starts.";

  return null;
}

export async function createTripAction(input: {
  id?: string;
  title: string;
  destination: string;
  startDate: string;
  endDate: string;
  description: string;
  coverPath: string | null;
  friendIds: string[];
}): Promise<TripActionResult> {
  const fields = {
    title: String(input?.title ?? "").trim(),
    destination: String(input?.destination ?? "").trim(),
    startDate: String(input?.startDate ?? ""),
    endDate: String(input?.endDate ?? ""),
    description: String(input?.description ?? "").trim(),
  };
  const problem = validateTripFields(fields);

  if (problem) {
    return { error: problem };
  }

  const { supabase, user } = await requireTripUser();
  // A client-generated id means the trip exists on screen before this insert
  // finishes, and the same id is used for its members.
  const tripId =
    typeof input?.id === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      input.id
    )
      ? input.id
      : undefined;
  const { data: trip, error } = await supabase
    .from("trips")
    .insert({
      ...(tripId ? { id: tripId } : {}),
      title: fields.title,
      destination: fields.destination || null,
      start_date: fields.startDate,
      end_date: fields.endDate,
      description: fields.description || null,
      cover_path: input.coverPath || null,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (error || !trip) {
    return { error: "Couldn't create that trip. Try again." };
  }

  // Creator is always a member. Friends are added only if they are accepted friends.
  const friendIds = [...new Set(input.friendIds ?? [])].filter((id) => id !== user.id);
  const { data: friendships, error: friendshipsError } = await supabase
    .from("friendships")
    .select("requester_id,addressee_id")
    .eq("status", "accepted")
    .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`);

  if (friendshipsError) {
    await supabase.from("trips").delete().eq("id", trip.id);
    return { error: "Couldn't set up that trip. Try again." };
  }

  const accepted = new Set(
    ((friendships ?? []) as { requester_id: string; addressee_id: string }[]).map((row) =>
      row.requester_id === user.id ? row.addressee_id : row.requester_id
    )
  );
  const memberRows = [user.id, ...friendIds.filter((id) => accepted.has(id))].map((userId) => ({
    trip_id: trip.id,
    user_id: userId,
  }));
  const { error: memberError } = await supabase.from("trip_members").insert(memberRows);

  if (memberError) {
    await supabase.from("trips").delete().eq("id", trip.id);
    return { error: "Couldn't set up that trip. Try again." };
  }

  return { id: trip.id as string };
}

export async function updateTripAction(input: {
  tripId: string;
  title: string;
  destination: string;
  startDate: string;
  endDate: string;
  description: string;
}): Promise<TripActionResult> {
  const fields = {
    title: String(input?.title ?? "").trim(),
    destination: String(input?.destination ?? "").trim(),
    startDate: String(input?.startDate ?? ""),
    endDate: String(input?.endDate ?? ""),
    description: String(input?.description ?? "").trim(),
  };
  const problem = validateTripFields(fields);

  if (problem) {
    return { error: problem };
  }

  const { supabase, user } = await requireTripUser();
  const { data, error } = await supabase
    .from("trips")
    .update({
      title: fields.title,
      destination: fields.destination || null,
      start_date: fields.startDate,
      end_date: fields.endDate,
      description: fields.description || null,
    })
    .eq("id", input.tripId)
    .eq("created_by", user.id)
    .select("id");

  if (error) {
    return { error: "Couldn't save those changes. Try again." };
  }

  if (!data || data.length === 0) {
    return { error: "Only the trip's creator can edit it." };
  }

  return { id: input.tripId };
}

export async function deleteTripAction(tripId: string): Promise<TripActionResult> {
  const { supabase, user } = await requireTripUser();
  const { data, error } = await supabase
    .from("trips")
    .delete()
    .eq("id", tripId)
    .eq("created_by", user.id)
    .select("id");

  if (error) {
    return { error: "Couldn't delete that trip. Try again." };
  }

  if (!data || data.length === 0) {
    return { error: "Only the trip's creator can delete it." };
  }

  return {};
}
