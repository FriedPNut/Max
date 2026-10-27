import { NextResponse } from "next/server";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { sendPushToUser } from "@/lib/push-server";

export async function POST() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Sign in to send a test." }, { status: 401 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Sign in to send a test." }, { status: 401 });
  }

  try {
    const result = await sendPushToUser(user.id, {
      title: "Max",
      body: "This is a test notification.",
      url: "/settings/notifications",
      tag: "max-push-test",
    });

    if (!result.sent) {
      return NextResponse.json(
        {
          error:
            result.statusCodes.length === 0
              ? "No push-enabled devices were found."
              : "The push service refused the test.",
          statusCodes: result.statusCodes,
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      sent: result.sent,
      failed: result.failed,
      statusCodes: result.statusCodes,
    });
  } catch (error) {
    // Config messages name settings only; they never include a value.
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Couldn't send a test notification.",
      },
      { status: 500 }
    );
  }
}
