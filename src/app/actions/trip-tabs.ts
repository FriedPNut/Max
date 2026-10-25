"use server";

import { revalidatePath } from "next/cache";
import { requireTripMember, requireTripUser, type TripActionResult } from "@/app/actions/trips";
import { TRIP_LINK_KINDS, type TripLinkKind } from "@/lib/trips";

function clean(value: unknown) {
  return String(value ?? "").trim();
}

async function memberOrError(tripId: string) {
  const { supabase, user } = await requireTripUser();
  const isMember = await requireTripMember(supabase, tripId, user.id);
  return isMember ? { supabase, user } : null;
}

export async function addItineraryItemAction(input: {
  tripId: string;
  day: string;
  title: string;
  timeLabel: string;
}): Promise<TripActionResult> {
  const title = clean(input?.title);
  const day = clean(input?.day);
  const timeLabel = clean(input?.timeLabel);

  if (!title) return { error: "Add a title." };
  if (title.length > 120) return { error: "Keep the title under 120 characters." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return { error: "Pick a day." };
  if (timeLabel.length > 40) return { error: "Keep the time under 40 characters." };

  const ctx = await memberOrError(input.tripId);
  if (!ctx) return { error: "You're not in this trip." };

  const { error } = await ctx.supabase.from("trip_itinerary_items").insert({
    trip_id: input.tripId,
    day,
    title,
    time_label: timeLabel || null,
    created_by: ctx.user.id,
  });

  if (error) return { error: "Couldn't add that item. Try again." };
  revalidatePath(`/trips/${input.tripId}`);
  return {};
}

export async function deleteItineraryItemAction(tripId: string, itemId: string): Promise<TripActionResult> {
  const ctx = await memberOrError(tripId);
  if (!ctx) return { error: "You're not in this trip." };

  const { error } = await ctx.supabase.from("trip_itinerary_items").delete().eq("id", itemId).eq("trip_id", tripId);
  if (error) return { error: "Couldn't delete that item. Try again." };
  revalidatePath(`/trips/${tripId}`);
  return {};
}

export async function addPackingItemAction(tripId: string, label: string): Promise<TripActionResult> {
  const clean_label = clean(label);
  if (!clean_label) return { error: "Add an item." };
  if (clean_label.length > 120) return { error: "Keep the item under 120 characters." };

  const ctx = await memberOrError(tripId);
  if (!ctx) return { error: "You're not in this trip." };

  const { error } = await ctx.supabase.from("trip_packing_items").insert({
    trip_id: tripId,
    label: clean_label,
    created_by: ctx.user.id,
  });

  if (error) return { error: "Couldn't add that item. Try again." };
  revalidatePath(`/trips/${tripId}`);
  return {};
}

export async function togglePackingItemAction(tripId: string, itemId: string, packed: boolean): Promise<TripActionResult> {
  const ctx = await memberOrError(tripId);
  if (!ctx) return { error: "You're not in this trip." };

  const { error } = await ctx.supabase
    .from("trip_packing_items")
    .update({ packed })
    .eq("id", itemId)
    .eq("trip_id", tripId);

  if (error) return { error: "Couldn't update that item. Try again." };
  revalidatePath(`/trips/${tripId}`);
  return {};
}

export async function deletePackingItemAction(tripId: string, itemId: string): Promise<TripActionResult> {
  const ctx = await memberOrError(tripId);
  if (!ctx) return { error: "You're not in this trip." };

  const { error } = await ctx.supabase.from("trip_packing_items").delete().eq("id", itemId).eq("trip_id", tripId);
  if (error) return { error: "Couldn't delete that item. Try again." };
  revalidatePath(`/trips/${tripId}`);
  return {};
}

export async function addTripLinkAction(input: {
  tripId: string;
  kind: string;
  title: string;
  url: string;
}): Promise<TripActionResult> {
  const title = clean(input?.title);
  const url = clean(input?.url);
  const kind = clean(input?.kind) as TripLinkKind;

  if (!(TRIP_LINK_KINDS as readonly string[]).includes(kind)) return { error: "Pick a type." };
  if (!title) return { error: "Add a title." };
  if (title.length > 120) return { error: "Keep the title under 120 characters." };

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return { error: "Enter a full link starting with https://" };
  }

  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    return { error: "Links must start with http:// or https://" };
  }

  const ctx = await memberOrError(input.tripId);
  if (!ctx) return { error: "You're not in this trip." };

  const { error } = await ctx.supabase.from("trip_links").insert({
    trip_id: input.tripId,
    kind,
    title,
    url: parsed.toString(),
    created_by: ctx.user.id,
  });

  if (error) return { error: "Couldn't save that link. Try again." };
  revalidatePath(`/trips/${input.tripId}`);
  return {};
}

export async function deleteTripLinkAction(tripId: string, linkId: string): Promise<TripActionResult> {
  const ctx = await memberOrError(tripId);
  if (!ctx) return { error: "You're not in this trip." };

  const { error } = await ctx.supabase.from("trip_links").delete().eq("id", linkId).eq("trip_id", tripId);
  if (error) return { error: "Couldn't delete that link. Try again." };
  revalidatePath(`/trips/${tripId}`);
  return {};
}
