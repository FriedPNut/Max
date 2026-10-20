import { redirect } from "next/navigation";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { AuthForm } from "@/components/auth-form";

export default async function LoginPage() {
  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      redirect("/");
    }
  }

  return (
    <main className="min-h-dvh bg-paper text-ink px-4 py-8 sm:py-14">
      <div className="mx-auto w-full max-w-[480px] md:max-w-[720px]">
        {/* Top Masthead Bar — Printed Zine / Poster Metadata */}
        <header className="border-b border-line pb-4 mb-10 sm:mb-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span
              aria-hidden="true"
              className="inline-block w-2 h-2 bg-accent"
            />
            <span className="font-mono text-xs uppercase tracking-[0.08em] text-ink">
              ISSUE 01 · PRIVATE CREW
            </span>
          </div>
          <span className="font-mono text-xs uppercase tracking-[0.08em] text-muted">
            INVITE ONLY
          </span>
        </header>

        {/* Asymmetric Editorial Layout on Desktop, Stacked Mobile-First */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10 md:gap-12 items-start">
          {/* Left Column: Huge "Max" Wordmark + Tagline in Mono */}
          <section className="md:col-span-6 flex flex-col justify-between">
            <div>
              <h1 className="font-display font-extrabold text-[88px] sm:text-[116px] md:text-[128px] leading-[0.9] tracking-[-0.04em] text-ink select-none">
                Max
                <span className="text-accent">.</span>
              </h1>

              <p className="mt-6 font-mono text-xs sm:text-sm uppercase tracking-[0.06em] text-ink leading-relaxed max-w-[32ch]">
                Maximum potential. Maximum fun. Maximum productivity.
              </p>
            </div>

            <div className="mt-8 pt-6 border-t border-line hidden md:block">
              <p className="text-sm text-muted leading-relaxed max-w-[34ch]">
                Plans, group chat, and camera roll for the people you actually
                hang out with.
              </p>
            </div>
          </section>

          {/* Right Column: Clean Form */}
          <section className="md:col-span-6 w-full">
            <AuthForm />
          </section>
        </div>

        {/* Mobile Footer Note */}
        <footer className="mt-14 pt-6 border-t border-line flex items-center justify-between text-xs font-mono uppercase tracking-[0.06em] text-muted">
          <span>NO ALGORITHMS · NO RANDOMS</span>
          <span>VOL. I</span>
        </footer>
      </div>
    </main>
  );
}
