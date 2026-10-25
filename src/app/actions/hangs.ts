"use server";

import { redirect } from "next/navigation";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import {
  HANG_MESSAGE_MAX,
  expiresAtFor,
  isHangDuration,
  type HangResponse,
} from "@/lib/hangs";

export type HangActionState = {
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

export async function createHangAction(input: {
  message: string;
  location?: string | null;
  duration: string;
}): Promise<HangActionState> {
  const message = String(input?.message ?? "").trim();
  const location = String(input?.location ?? "").trim() || null;
  const duration = String(input?.duration ?? "");
  const { supabase, user } = await requireUser();

  if (!message) {
    return { error: "Say what you're up for." };
  }

  if (message.length > HANG_MESSAGE_MAX) {
    return { error: `Keep it under ${HANG_MESSAGE_MAX} characters.` };
  }

  if (location && location.length > 120) {
    return { error: "Keep the location under 120 characters." };
  }

  if (!isHangDuration(duration)) {
    return { error: "Pick how long it's open." };
  }

  const { data: active, error: activeError } = await supabase
    .from("hangs")
    .select("id")
    .eq("created_by", user.id)
    .gt("expires_at", new Date().toISOString())
    .limit(1);

  if (activeError) {
    return { error: "Couldn't start a hang. Try again." };
  }

  if (active && active.length > 0) {
    return { error: "You already have one going. End it first." };
  }

  const { error } = await supabase.from("hangs").insert({
    created_by: user.id,
    message,
    location,
    expires_at: expiresAtFor(duration).toISOString(),
  });

  if (error) {
    return { error: "Couldn't start a hang. Try again." };
  }

  return { success: true };
}

export async function respondToHangAction(input: {
  hangId: string;
  response: HangResponse | null;
}): Promise<HangActionState> {
  const hangId = String(input?.hangId ?? "").trim();
  const { supabase, user } = await requireUser();

  if (!hangId) {
    return { error: "We couldn't find that hang." };
  }

  if (input.response === null) {
    const { error } = await supabase
      .from("hang_responses")
      .delete()
      .eq("hang_id", hangId)
      .eq("user_id", user.id);

    return error ? { error: "Couldn't update that. Try again." } : { success: true };
  }

  const { error } = await supabase.from("hang_responses").upsert(
    {
      hang_id: hangId,
      user_id: user.id,
      response: input.response,
    },
    { onConflict: "hang_id,user_id" }
  );

  if (error) {
    return { error: "Couldn't save your answer. Try again." };
  }

  return { success: true };
}

export async function endHangAction(
  hangId: string
): Promise<HangActionState> {
  const cleanId = String(hangId ?? "").trim();
  const { supabase, user } = await requireUser();

  if (!cleanId) {
    return { error: "We couldn't find that hang." };
  }

  const { data, error } = await supabase
    .from("hangs")
    .delete()
    .eq("id", cleanId)
    .eq("created_by", user.id)
    .select("id");

  if (error) {
    return { error: "Couldn't end that hang. Try again." };
  }

  if (!data || data.length === 0) {
    return { error: "Only the person who started it can end it." };
  }

  return { success: true };
}
