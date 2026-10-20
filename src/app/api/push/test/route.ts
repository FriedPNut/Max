import { NextResponse } from "next/server";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { sendPushToUser } from "@/lib/push-server";

export const runtime = "nodejs";

export async function POST() {
  if (!isSupabaseConfigured()) return NextResponse.json({ error: "Sign in to send a test." }, { status: 401 });
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in to send a test." }, { status: 401 });
  try {
    const result = await sendPushToUser(user.id, { title: "Max", body: "This is a test notification.", url: "/settings/notifications", tag: "max-push-test" });
    if (!result.sent) return NextResponse.json({ error: "No push-enabled devices were found." }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Couldn't send a test notification." }, { status: 500 });
  }
}
