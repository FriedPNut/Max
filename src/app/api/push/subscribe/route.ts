import { NextResponse } from "next/server";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { pushServerStatus } from "@/lib/push-env";


export async function POST(request: Request) {
  if (!isSupabaseConfigured()) return NextResponse.json({ error: "Sign in to save this device." }, { status: 401 });
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in to save this device." }, { status: 401 });

  let input: { endpoint?: unknown; keys?: { p256dh?: unknown; auth?: unknown } };
  try { input = await request.json(); } catch { return NextResponse.json({ error: "That subscription isn't valid." }, { status: 400 }); }
  const endpoint = typeof input.endpoint === "string" ? input.endpoint.trim() : "";
  const p256dh = typeof input.keys?.p256dh === "string" ? input.keys.p256dh : "";
  const auth = typeof input.keys?.auth === "string" ? input.keys.auth : "";
  if (!endpoint.startsWith("https://") || !p256dh || !auth) return NextResponse.json({ error: "That subscription isn't valid." }, { status: 400 });

  try {
    const admin = createAdminClient();
    const { error } = await admin.from("push_subscriptions").upsert({
      user_id: user.id,
      endpoint,
      p256dh,
      auth,
      user_agent: request.headers.get("user-agent") ?? "",
    }, { onConflict: "endpoint" });
    if (error) return NextResponse.json({ error: "Couldn't save this device." }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch {
    // Names only: never echo a secret back to the browser.
    const { missing } = pushServerStatus();
    return NextResponse.json(
      {
        error: missing.length
          ? `The server can't save devices. Missing: ${missing.join(", ")}.`
          : "Push notifications aren't configured.",
      },
      { status: 500 }
    );
  }
}
