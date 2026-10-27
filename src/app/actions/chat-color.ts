"use server";

import { redirect } from "next/navigation";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { DEFAULT_BUBBLE_COLOR, normalizeHex } from "@/lib/bubble-colors";

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

/**
 * Stores the chat color on the profile. The screen has already repainted with
 * the new color, so this only has to persist it.
 */
export async function updateBubbleColorAction(
  color: string
): Promise<{ error?: string; color?: string }> {
  const hex = normalizeHex(color);

  if (!hex) {
    return { error: "Pick a color like #8B3BEB." };
  }

  const { supabase, user } = await requireUser();
  const { error } = await supabase
    .from("profiles")
    .update({ bubble_color: hex.toLowerCase() })
    .eq("id", user.id);

  if (error) {
    return { error: "Couldn't save your chat color. Try again." };
  }

  return { color: hex };
}

export async function resetBubbleColorAction(): Promise<{ error?: string }> {
  return updateBubbleColorAction(DEFAULT_BUBBLE_COLOR);
}
