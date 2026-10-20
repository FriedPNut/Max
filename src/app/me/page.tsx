import { AppShell, getAuthenticatedUser } from "@/components/app-shell";
import { signOutAction } from "@/app/actions/auth";

export default async function MePage() {
  const { user, displayName, initial } = await getAuthenticatedUser();

  return (
    <AppShell displayName={displayName} initial={initial}>
      <section className="space-y-6">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.08em] text-muted mb-2">
            MEMBER PASS
          </p>
          <h1 className="font-display font-extrabold text-[44px] leading-[0.98] tracking-[-0.03em] text-ink">
            {displayName}
          </h1>
        </div>

        <div className="bg-surface border border-line rounded-[6px] p-6 space-y-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-[4px] border-[1.5px] border-ink bg-paper flex items-center justify-center font-display font-extrabold text-xl text-ink">
              {initial}
            </div>
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.06em] text-muted">
                EMAIL
              </p>
              <p className="text-base text-ink font-medium">{user.email}</p>
            </div>
          </div>

          <div className="pt-4 border-t border-line">
            <form action={signOutAction}>
              <button
                type="submit"
                className="min-h-[44px] px-5 py-2.5 rounded-[4px] border-[1.5px] border-ink bg-transparent text-ink font-sans font-medium text-sm hover:bg-ink hover:text-paper active:translate-y-[1px] transition-colors duration-150 ease-out cursor-pointer"
              >
                Log out
              </button>
            </form>
          </div>
        </div>
      </section>
    </AppShell>
  );
}
