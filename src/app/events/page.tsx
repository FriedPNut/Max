import Link from "next/link";
import { CalendarPlus } from "lucide-react";
import { AppShell, getAuthenticatedUser } from "@/components/app-shell";
import { EventsHome } from "@/components/events/events-home";
import { createClient } from "@/lib/supabase/server";
import {
  loadEventListItems,
  loadIdeaListItems,
} from "@/lib/events-data";
import { loadPollVoteNeededCount } from "@/lib/polls";
import { getComingUpEvents } from "@/lib/coming-up";
import { PushPrompt } from "@/components/notifications/push-prompt";

export default async function EventsPage({
  searchParams,
}: {
  searchParams: Promise<{ idea?: string }>;
}) {
  const { idea: ideaParam } = await searchParams;
  const { user, displayName } = await getAuthenticatedUser();
  const supabase = await createClient();

  const [eventsResult, ideasResult, pollCountResult, rsvpsResult] = await Promise.all([
    loadEventListItems(supabase),
    loadIdeaListItems(supabase, user.id, ["open"], displayName),
    loadPollVoteNeededCount(supabase, user.id),
    supabase.from("rsvps").select("event_id,status").eq("user_id", user.id).in("status", ["going", "maybe"]),
  ]);
  const rsvpStatuses = new Map(
    (rsvpsResult.data ?? []).map((rsvp: { event_id: string; status: string }) => [rsvp.event_id, rsvp.status])
  );
  const comingUpEvents = getComingUpEvents(eventsResult.items, rsvpStatuses);

  const actions = (
    <Link
      href="/events/new"
      aria-label="Add event"
      className="inline-flex h-11 w-11 items-center justify-center rounded-lg text-text transition-colors duration-150 ease-out hover:bg-surface"
    >
      <CalendarPlus size={20} strokeWidth={1.5} aria-hidden="true" />
    </Link>
  );

  const loadError = eventsResult.error ?? ideasResult.error;

  return (
    <AppShell actions={actions} userId={user.id}>
      {loadError ? (
        <p className="text-sm text-muted">
          Couldn&apos;t load events. Refresh and try again.
        </p>
      ) : (
        <div className="space-y-6">
          {ideaParam === "restore-failed" && (
            <p className="text-sm text-muted">
              The event was deleted, but its idea couldn&apos;t be reopened.
              Refresh and try again.
            </p>
          )}

          <PushPrompt />
          <EventsHome
            initialIdeas={ideasResult.items}
            events={eventsResult.items}
            pollVoteCount={pollCountResult.count}
            comingUpEvents={comingUpEvents}
          />
        </div>
      )}
    </AppShell>
  );
}
