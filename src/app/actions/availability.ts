"use server";

import { redirect } from "next/navigation";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";

export type AvailabilityActionState = {
  error?: string;
  success?: boolean;
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

  return { supabase, user };
}

export async function addAvailabilityAction(input: {
  id?: string;
  startsAt: string;
  endsAt: string;
  note?: string | null;
}): Promise<AvailabilityActionState> {
  const startMs = new Date(input?.startsAt ?? "").getTime();
  const endMs = new Date(input?.endsAt ?? "").getTime();
  const note = String(input?.note ?? "").trim().slice(0, 140) || null;
  const { supabase, user } = await requireUser();

  if (Number.isNaN(startMs) || Number.isNaN(endMs) || endMs <= startMs) {
    return { error: "That time window doesn't look right." };
  }

  if (endMs <= Date.now()) {
    return { error: "That time has already passed." };
  }

  const windowId =
    typeof input?.id === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      input.id
    )
      ? input.id
      : undefined;

  const { error } = await supabase.from("availability").insert({
    ...(windowId ? { id: windowId } : {}),
    user_id: user.id,
    starts_at: new Date(startMs).toISOString(),
    ends_at: new Date(endMs).toISOString(),
    note,
  });

  if (error) {
    return { error: "Couldn't save that time. Try again." };
  }

  return { success: true };
}

export async function removeAvailabilityAction(
  availabilityId: string
): Promise<AvailabilityActionState> {
  const cleanId = String(availabilityId ?? "").trim();
  const { supabase, user } = await requireUser();

  if (!cleanId) {
    return { error: "We couldn't find that time." };
  }

  const { data, error } = await supabase
    .from("availability")
    .delete()
    .eq("id", cleanId)
    .eq("user_id", user.id)
    .select("id");

  if (error) {
    return { error: "Couldn't remove that time. Try again." };
  }

  if (!data || data.length === 0) {
    return { error: "That time isn't yours to remove." };
  }

  return { success: true };
}
