import { NextResponse } from "next/server";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { pushServerStatus } from "@/lib/push-env";

/**
 * Everything the debug panel needs to explain a broken push, with no secret
 * values in the response: only set/not-set, valid/not-valid and counts.
 */
export async function GET(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Sign in to check push." }, { status: 401 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Sign in to check push." }, { status: 401 });
  }

  const status = pushServerStatus();
  const endpoint = new URL(request.url).searchParams.get("endpoint")?.trim() ?? "";
  let subscriptions: number | null = null;
  let pendingNotifications: number | null = null;
  let endpointSaved: boolean | null = null;

  try {
    const admin = createAdminClient();
    const [subscriptionsResult, pendingResult] = await Promise.all([
      admin
        .from("push_subscriptions")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id),
      admin
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .is("push_done_at", null),
    ]);

    subscriptions = subscriptionsResult.error
      ? null
      : subscriptionsResult.count ?? 0;
    pendingNotifications = pendingResult.error
      ? null
      : pendingResult.count ?? 0;

    if (endpoint.startsWith("https://")) {
      const { data, error } = await admin
        .from("push_subscriptions")
        .select("id")
        .eq("user_id", user.id)
        .eq("endpoint", endpoint)
        .maybeSingle();

      endpointSaved = error ? null : Boolean(data);
    }
  } catch {
    // The service-role key is missing; the flags already say so.
  }

  return NextResponse.json(
    {
      settings: status.flags,
      missing: status.missing,
      vapidPairValid: status.vapidPairValid,
      subjectValid: status.subjectValid,
      subscriptions,
      pendingNotifications,
      endpointSaved,
    },
    { headers: { "cache-control": "no-store" } }
  );
}
