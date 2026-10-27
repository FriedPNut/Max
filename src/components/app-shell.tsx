import { redirect } from "next/navigation";
import { cache, type ReactNode } from "react";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { PresenceProvider } from "@/components/presence-provider";
import { SubHeader } from "@/components/shell/headers";
import { ShellActionsSync, ShellProfileSync } from "@/lib/shell-state";
import { resolveProfileAvatarUrls } from "@/lib/profile-data";

export const getAuthenticatedUser = cache(async function getAuthenticatedUser() {
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
});

/**
 * A page's chrome and content. The frame itself (scroller, root header, tab
 * bar) is mounted once in the root layout, so pages only own their own header
 * and their content:
 *
 * - tab roots render no header here; the shell shows the wordmark one,
 * - every other screen gets the compact SubHeader when it passes a `title`,
 *   or draws its own richer header (a conversation, an event).
 */
export async function AppShell({
  children,
  title,
  actions,
  userId,
  anonymous = false,
}: {
  children: ReactNode;
  /** Left-aligned title for the compact header. Omit to draw your own. */
  title?: string;
  /** Right-side action icons. */
  actions?: ReactNode;
  userId?: string;
  /**
   * Chrome only: no session read, no profile query. Used by the 404 screens,
   * which also render while routes are prerendered.
   */
  anonymous?: boolean;
}) {
  if (anonymous) {
    return (
      <>
        {title ? <SubHeader title={title} actions={actions} /> : null}
        <div className="mx-auto w-full max-w-[560px] px-4 pt-6">
          {children}
        </div>
      </>
    );
  }

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
      <ShellProfileSync
        next={{ userId: activeUserId, name, initial, avatarUrl }}
      />
      {actions ? <ShellActionsSync actions={actions} /> : null}

      {title ? <SubHeader title={title} actions={actions} /> : null}

      <div className="mx-auto w-full max-w-[560px] px-4 pt-6">{children}</div>
    </PresenceProvider>
  );
}
