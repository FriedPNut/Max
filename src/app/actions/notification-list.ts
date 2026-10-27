"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";

export async function markNotificationReadAction(notificationId: string) {
  if (!isSupabaseConfigured()) redirect("/login");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const id = String(notificationId ?? "").trim();
  if (!id) return { error: "Couldn't open that notification." };
  // The row already looks read on screen; persist after the response so the
  // tap never waits on the write.
  after(async () => {
    await supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("id", id)
      .eq("user_id", user.id);
    revalidatePath("/notifications");
  });
  return {};
}
