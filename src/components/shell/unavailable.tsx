import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { buttonStyles } from "@/components/ui/button";
import { tabDefinition, type TabKey } from "@/lib/tabs";

/** The message itself, for pages that already render the app shell. */
export function MissingContent({ tab }: { tab: TabKey }) {
  const { label, root } = tabDefinition(tab);

  return (
    <section className="space-y-3 py-12 text-center">
      <h1 className="text-[22px] font-bold leading-tight text-text">
        This isn’t available anymore.
      </h1>
      <p className="text-sm text-muted">
        It may have been deleted, or you may not have access.
      </p>
      <div className="pt-4">
        <Link
          href={root}
          className={buttonStyles({ variant: "primary", className: "w-full" })}
        >
          Back to {label}
        </Link>
      </div>
    </section>
  );
}

/**
 * Replaces a blank 404 when a link points at content that was deleted or is
 * no longer shared with this person. Always offers the owning tab.
 *
 * These screens render while routes are prerendered, so they use the chrome
 * only shell: no session read, no profile query, no signed photo URLs and no
 * clock. Everything personal (the avatar, the unread dot) is client work that
 * starts after mount.
 */
export function Unavailable({ tab }: { tab: TabKey }) {
  return (
    <AppShell anonymous>
      <MissingContent tab={tab} />
    </AppShell>
  );
}

/** The plain 404 for a URL that has no page, inside the app shell. */
export function PageNotFound() {
  return (
    <AppShell anonymous>
      <section className="space-y-3 py-12 text-center">
        <h1 className="text-[22px] font-bold leading-tight text-text">
          This page doesn’t exist.
        </h1>
        <p className="text-sm text-muted">
          Check the link, or head back to your events.
        </p>
        <div className="pt-4">
          <Link
            href="/events"
            className={buttonStyles({ variant: "primary", className: "w-full" })}
          >
            Back to Events
          </Link>
        </div>
      </section>
    </AppShell>
  );
}
