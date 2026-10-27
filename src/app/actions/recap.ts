"use server";

import { redirect } from "next/navigation";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { addDaysToKey, currentWeekStartKey, type RecapWeek, type WrappedYear } from "@/lib/recap";
import { loadRecapWeek, loadWrapped } from "@/lib/recap-data";

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

  const displayName =
    (typeof user.user_metadata?.display_name === "string" &&
      user.user_metadata.display_name.trim()) ||
    user.email?.split("@")[0] ||
    "friend";

  return { supabase, userId: user.id, displayName };
}

function clampWeekOffset(offset: number) {
  if (!Number.isInteger(offset) || offset > 0) {
    return 0;
  }

  return Math.max(-104, offset);
}

export async function loadRecapAction(
  weekOffset: number,
  timeZone: string
): Promise<{ data?: RecapWeek; error?: string }> {
  const { supabase, userId, displayName } = await requireUser();
  const zone = String(timeZone ?? "").trim() || "UTC";
  // A Server Action is request time, so reading the clock here is fine.
  const now = Date.now();
  const thisWeek = currentWeekStartKey(zone, new Date(now));
  const weekStartKey = addDaysToKey(thisWeek, clampWeekOffset(Number(weekOffset)) * 7);

  return loadRecapWeek(supabase, {
    userId,
    displayName,
    timeZone: zone,
    weekStartKey,
    now,
  });
}

export async function loadWrappedAction(
  year: number,
  timeZone: string
): Promise<{ data?: WrappedYear; error?: string }> {
  const requested = Number(year);
  const currentYear = new Date().getFullYear();

  if (!Number.isInteger(requested) || requested < 2000 || requested > currentYear) {
    return { error: "That year isn't ready yet." };
  }

  const { supabase, userId, displayName } = await requireUser();
  const zone = String(timeZone ?? "").trim() || "UTC";

  return loadWrapped(supabase, { userId, displayName, timeZone: zone, year: requested });
}
