import { AppShell, getAuthenticatedUser } from "@/components/app-shell";

export default async function FeedPage() {
  const { displayName, initial } = await getAuthenticatedUser();

  return (
    <AppShell displayName={displayName} initial={initial}>
      <section className="space-y-6">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.08em] text-muted mb-2">
            FEED · 0ROLLS
          </p>
          <h1 className="font-display font-extrabold text-[44px] leading-[0.98] tracking-[-0.03em] text-ink">
            Feed
          </h1>
        </div>

        <div className="bg-surface border border-line rounded-[6px] p-6">
          <p className="text-base text-muted">
            No photos posted yet. Last night&apos;s camera roll goes here.
          </p>
        </div>
      </section>
    </AppShell>
  );
}
