import { NextResponse } from "next/server";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";


export async function GET() {
  if (!isSupabaseConfigured()) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  const { data, error } = await supabase.from("notification_preferences").select("push_enabled").eq("user_id", user.id).maybeSingle();
  if (error) return NextResponse.json({ error: "Couldn't load notification settings." }, { status: 500 });
  return NextResponse.json({ push_enabled: data?.push_enabled ?? true });
}
