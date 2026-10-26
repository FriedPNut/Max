import { redirect } from "next/navigation";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { AppShellClient } from "@/components/shell/app-shell-client";
import { PresenceProvider } from "@/components/presence-provider";
import { resolveProfileAvatarUrls } from "@/lib/profile-data";

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
  noIsland = false,
}: {
  children: React.ReactNode;
  actions?: React.ReactNode;
  userId?: string;
  /** Hides the island bar on full-screen screens such as conversations and composers. */
  noIsland?: boolean;
}) {
  // Pages that already authenticated pass their user id, so only resolve the
  // session here when it is actually needed.
  let activeUserId = userId;
  let fallbackName: string | null = null;
  let fallbackInitial = "M";

  if (!activeUserId) {
    const auth = await getAuthenticatedUser();
    activeUserId = auth.user.id;
    fallbackName = auth.displayName;
    fallbackInitial = auth.initial;
  }

  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name,username,avatar_url")
    .eq("id", activeUserId)
    .maybeSingle();

  let name =
    profile?.display_name?.trim() ||
    profile?.username?.trim() ||
    fallbackName;

  if (!name) {
    const auth = await getAuthenticatedUser();
    name = auth.displayName;
    fallbackInitial = auth.initial;
  }

  const initial = name.charAt(0).toUpperCase() || fallbackInitial;

  let avatarUrl: string | null = null;

  if (profile?.avatar_url) {
    const urls = await resolveProfileAvatarUrls(supabase, [
      { id: activeUserId, avatar_url: profile.avatar_url },
    ]);
    avatarUrl = urls.get(activeUserId) ?? null;
  }

  return (
    <PresenceProvider userId={activeUserId}>
      <AppShellClient
        userId={activeUserId}
        name={name}
        initial={initial}
        avatarUrl={avatarUrl}
        actions={actions}
        noIsland={noIsland}
      >
        {children}
      </AppShellClient>
    </PresenceProvider>
  );
}
