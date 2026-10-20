import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AppShell, getAuthenticatedUser } from "@/components/app-shell";
import { IdeasPage } from "@/components/events/ideas-page";
import { createClient } from "@/lib/supabase/server";
import {
  loadEventListItems,
  loadIdeaListItems,
} from "@/lib/events-data";

export default async function IdeasSubPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const { view } = await searchParams;
  const { user, displayName } = await getAuthenticatedUser();
  const supabase = await createClient();

  const [eventsResult, ideasResult] = await Promise.all([
    loadEventListItems(supabase),
    loadIdeaListItems(
      supabase,
      user.id,
      ["open", "scheduled"],
      displayName
    ),
  ]);

  const loadError = eventsResult.error ?? ideasResult.error;

  return (
    <AppShell>
      {loadError ? (
        <section className="space-y-6">
          <div className="flex items-center gap-2">
            <Link
              href="/events"
              aria-label="Back to events"
              className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-text transition-colors duration-150 ease-out hover:bg-surface"
            >
              <ArrowLeft size={20} strokeWidth={1.5} aria-hidden="true" />
            </Link>

            <h1 className="text-[28px] font-semibold leading-tight text-text">
              Ideas
            </h1>
          </div>

          <p className="text-sm text-muted">
            Couldn&apos;t load ideas. Refresh and try again.
          </p>
        </section>
      ) : (
        <IdeasPage
          initialIdeas={ideasResult.items}
          events={eventsResult.items}
          nowIso={new Date().toISOString()}
          initialView={view === "events" ? "events" : "ideas"}
        />
      )}
    </AppShell>
  );
}
