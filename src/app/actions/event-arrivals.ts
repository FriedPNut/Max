"use server";

import { redirect } from "next/navigation";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { ARRIVAL_ETA_OPTIONS, type ArrivalEta } from "@/lib/event-arrivals";

export type ArrivalActionResult = { error?: string };

async function requireUserId() {
  if (!isSupabaseConfigured()) redirect("/login");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, userId: user.id };
}

export async function setOnMyWayAction(eventId: string, etaMinutes: number): Promise<ArrivalActionResult> {
  if (!(ARRIVAL_ETA_OPTIONS as readonly number[]).includes(etaMinutes)) {
    return { error: "Pick a time between 5 and 45 minutes." };
  }

  const { supabase, userId } = await requireUserId();
  const { error } = await supabase.from("event_arrivals").upsert(
    {
      event_id: eventId,
      user_id: userId,
      status: "on_my_way",
      eta_minutes: etaMinutes as ArrivalEta,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "event_id,user_id" }
  );

  return error ? { error: "Couldn't update your arrival. Try again." } : {};
}

export async function setHereAction(eventId: string): Promise<ArrivalActionResult> {
  const { supabase, userId } = await requireUserId();
  const { error } = await supabase.from("event_arrivals").upsert(
    {
      event_id: eventId,
      user_id: userId,
      status: "here",
      eta_minutes: null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "event_id,user_id" }
  );

  return error ? { error: "Couldn't update your arrival. Try again." } : {};
}

export async function cancelArrivalAction(eventId: string): Promise<ArrivalActionResult> {
  const { supabase, userId } = await requireUserId();
  const { error } = await supabase
    .from("event_arrivals")
    .delete()
    .eq("event_id", eventId)
    .eq("user_id", userId);

  return error ? { error: "Couldn't clear your arrival. Try again." } : {};
}
