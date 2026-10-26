import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { BottomTabBar } from "@/components/bottom-tab-bar";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { PresenceProvider } from "@/components/presence-provider";

export async function getAuthenticatedUser() {
  if (!isSupabaseConfigured()) {
    redirect("/login");
  }

  const supabase = await createClient();
  // getClaims verifies the JWT signature and refreshes the cookie when needed,
  // so rendering the shell no longer waits on a network call to Auth.
  const { data: claimsData } = await supabase.auth.getClaims();
  const claims = claimsData?.claims;

  if (!claims?.sub) {
    redirect("/login");
  }

  const user = {
    id: claims.sub,
    email: typeof claims.email === "string" ? claims.email : null,
    user_metadata: (claims.user_metadata ?? {}) as Record<string, unknown>,
  };

  const rawDisplayName =
    typeof user.user_metadata?.display_name === "string"
      ? user.user_metadata.display_name.trim()
      : "";

  const fallbackName = user.email ? user.email.split("@")[0] : "friend";
  const displayName = rawDisplayName || fallbackName;
  const initial = displayName.charAt(0).toUpperCase() || "M";

  return {
    user,
    displayName,
    initial,
  };
}

export async function AppShell({
  children,
  actions,
  userId,
}: {
  children: React.ReactNode;
  actions?: React.ReactNode;
  userId?: string;
}) {
  const activeUserId = userId ?? (await getAuthenticatedUser()).user.id;
  return (
    <PresenceProvider userId={activeUserId}>
    <div className="min-h-dvh bg-background text-text">
      <header
        className="fixed inset-x-0 top-0 z-40 border-b border-line bg-background"
        style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
      >
        <div className="mx-auto flex h-14 w-full max-w-[560px] items-center justify-between px-4">
          <Link
            href="/events"
            className="inline-flex min-h-11 items-center text-lg font-semibold text-text"
          >
            Max
          </Link>

          <div className="flex items-center gap-1">
            <NotificationBell userId={activeUserId} />
            {actions}
          </div>
        </div>
      </header>

      {/* The main column is the only scroll area, so the chrome never moves. */}
      <main
        className="w-full overflow-x-hidden overflow-y-auto"
        style={{
          height: "100dvh",
          paddingTop: "calc(env(safe-area-inset-top, 0px) + 56px + 24px)",
          paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 56px + 24px)",
        }}
      >
        <div className="mx-auto w-full max-w-[560px] px-4">{children}</div>
      </main>

      <BottomTabBar />
    </div>
    </PresenceProvider>
  );
}
