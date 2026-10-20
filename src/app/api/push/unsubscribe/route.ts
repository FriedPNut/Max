import { NextResponse } from "next/server";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!isSupabaseConfigured()) return NextResponse.json({ error: "Sign in to remove this device." }, { status: 401 });
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in to remove this device." }, { status: 401 });
  let endpoint = "";
  try {
    const body = await request.json();
    endpoint = typeof body.endpoint === "string" ? body.endpoint.trim() : "";
  } catch { /* invalid body handled below */ }
  if (!endpoint.startsWith("https://")) return NextResponse.json({ error: "That device isn't valid." }, { status: 400 });
  try {
    const { error } = await createAdminClient().from("push_subscriptions").delete().eq("endpoint", endpoint).eq("user_id", user.id);
    if (error) return NextResponse.json({ error: "Couldn't remove this device." }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Push notifications aren't configured." }, { status: 500 });
  }
}
