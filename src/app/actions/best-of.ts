"use server";

import { redirect } from "next/navigation";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { parseMonthKey, type BestOfMonth } from "@/lib/best-of";
import { loadBestOfMonth } from "@/lib/best-of-data";

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

export async function loadBestOfAction(
  monthKey: string,
  timeZone: string
): Promise<{ data?: BestOfMonth; error?: string }> {
  const key = String(monthKey ?? "").trim();

  if (!parseMonthKey(key)) {
    return { error: "That month doesn't look right." };
  }

  const { supabase, userId, displayName } = await requireUser();
  const zone = String(timeZone ?? "").trim() || "UTC";

  return loadBestOfMonth(supabase, {
    userId,
    displayName,
    timeZone: zone,
    monthKey: key,
  });
}
