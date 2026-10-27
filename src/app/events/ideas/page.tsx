import Link from "next/link";
import { AppShell, getAuthenticatedUser } from "@/components/app-shell";
import { IdeasPage } from "@/components/events/ideas-page";
import { createClient } from "@/lib/supabase/server";
import {
  loadEventListItems,
  loadIdeaListItems,
} from "@/lib/events-data";
import { serverNowIso } from "@/lib/server-now";

export default async function IdeasSubPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const { view } = await searchParams;
  const { user, displayName } = await getAuthenticatedUser();
  const supabase = await createClient();
  const nowIso = await serverNowIso();

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
    <AppShell title="Ideas">
      {loadError ? (
        <section className="space-y-6">
          <p className="text-sm text-muted">
            Couldn&apos;t load ideas. Refresh and try again.
          </p>
        </section>
      ) : (
        <IdeasPage
          userId={user.id}
          initialIdeas={ideasResult.items}
          events={eventsResult.items}
          nowIso={nowIso}
          initialView={view === "events" ? "events" : "ideas"}
        />
      )}
    </AppShell>
  );
}
