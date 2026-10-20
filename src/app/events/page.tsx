import { AppShell, getAuthenticatedUser } from "@/components/app-shell";

export default async function EventsPage() {
  const { displayName, initial } = await getAuthenticatedUser();

  return (
    <AppShell displayName={displayName} initial={initial}>
      <section className="space-y-8">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.08em] text-muted mb-3">
            EVENTS · 0
          </p>
          <h1 className="font-display font-extrabold text-[44px] sm:text-[72px] leading-[0.95] tracking-[-0.03em] text-ink">
            Hey, {displayName}.
          </h1>
        </div>

        <div className="bg-surface border border-line rounded-[6px] p-6 sm:p-8">
          <p className="text-lg sm:text-xl text-ink font-normal leading-snug">
            Nothing planned yet. Make the first move.
          </p>
        </div>
      </section>
    </AppShell>
  );
}
