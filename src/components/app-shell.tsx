import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { signOutAction } from "@/app/actions/auth";
import { BottomTabBar } from "@/components/bottom-tab-bar";

export async function getAuthenticatedUser() {
  if (!isSupabaseConfigured()) {
    redirect("/login");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

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

export function AppShell({
  displayName,
  initial,
  children,
}: {
  displayName: string;
  initial: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-dvh bg-paper text-ink pb-24">
      <div className="mx-auto w-full max-w-[480px] md:max-w-[720px] px-4 pt-6 sm:pt-10">
        {/* Top Masthead */}
        <header className="flex items-center justify-between border-b border-line pb-4 mb-10 sm:mb-12">
          <Link
            href="/"
            className="font-display font-extrabold text-[28px] leading-none tracking-[-0.03em] text-ink"
          >
            Max<span className="text-accent">.</span>
          </Link>

          <div className="flex items-center gap-3">
            {/* Avatar per DESIGN.md: square with 4px radius, ink border, initial letter in display font */}
            <div
              title={displayName}
              className="w-8 h-8 rounded-[4px] border-[1.5px] border-ink bg-surface flex items-center justify-center font-display font-bold text-sm text-ink select-none"
            >
              {initial}
            </div>

            <form action={signOutAction}>
              <button
                type="submit"
                className="min-h-[44px] px-4 py-2 rounded-[4px] border-[1.5px] border-ink bg-transparent text-ink font-sans font-medium text-sm hover:bg-ink hover:text-paper active:translate-y-[1px] transition-colors duration-150 ease-out cursor-pointer"
              >
                Log out
              </button>
            </form>
          </div>
        </header>

        <main>{children}</main>
      </div>

      <BottomTabBar />
    </div>
  );
}
