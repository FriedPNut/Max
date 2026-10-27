import Link from "next/link";
import { redirect } from "next/navigation";
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
import { isArrivalFresh, type ArrivalRecord } from "@/lib/event-arrivals";
import { LazyPushPrompt } from "@/components/notifications/push-prompt-lazy";
import { HangBanner, type PendingHang } from "@/components/hang/hang-banner";
import { daysUntilBirthday } from "@/lib/birthdays";
import type { UpcomingBirthday } from "@/components/events/events-home";
import { logDataLoad, startDataTimer } from "@/lib/perf-server";
import { serverNow } from "@/lib/server-now";

export default async function EventsPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const dataStartedAt = startDataTimer();
  const { view: viewParam } = await searchParams;

  // The old Day view is gone; send saved or shared links back to Month.
  if (viewParam === "day") {
    redirect("/events");
  }
  const { user, displayName } = await getAuthenticatedUser();
  const supabase = await createClient();
  // Request-time "now": never baked into a prerendered shell.
  const now = await serverNow();
  const nowIso = new Date(now).toISOString();

  // Everything that only needs the signed-in user goes out in one batch.
  const [
    eventsResult,
    ideasResult,
    pollCountResult,
    rsvpsResult,
    friendshipResult,
    hangsResult,
  ] = await Promise.all([
    loadEventListItems(supabase),
    loadIdeaListItems(supabase, user.id, ["open"], displayName),
    loadPollVoteNeededCount(supabase, user.id),
    supabase.from("rsvps").select("event_id,status").eq("user_id", user.id).in("status", ["going", "maybe"]),
    supabase
      .from("friendships")
      .select("requester_id,addressee_id")
      .eq("status", "accepted")
      .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`),
    supabase
      .from("hangs")
      .select("id,created_by,message")
      .gt("expires_at", nowIso)
      .neq("created_by", user.id)
      .order("created_at", { ascending: false })
      .limit(10),
  ]);
  const rsvpStatuses = new Map(
    (rsvpsResult.data ?? []).map((rsvp: { event_id: string; status: string }) => [rsvp.event_id, rsvp.status])
  );
  const comingUpEvents = getComingUpEvents(eventsResult.items, rsvpStatuses, now);
  const comingUpIds = comingUpEvents.map((event) => event.id);
  const birthdayFriendIds = [
    ...new Set(
      ((friendshipResult.data ?? []) as { requester_id: string; addressee_id: string }[]).map((row) =>
        row.requester_id === user.id ? row.addressee_id : row.requester_id
      )
    ),
  ];
  const hangRows = (hangsResult.data ?? []) as {
    id: string;
    created_by: string;
    message: string;
  }[];
  const hangCreatorIds = [...new Set(hangRows.map((row) => row.created_by))];

  // Arrivals, birthdays, my hang answers and hang creator names are unrelated,
  // so they run side by side.
  const [arrivalsResult, birthdayProfilesResult, hangResponsesResult, hangCreatorsResult] =
    await Promise.all([
      comingUpIds.length > 0
        ? supabase
            .from("event_arrivals")
            .select("event_id,user_id,status,eta_minutes,updated_at")
            .eq("user_id", user.id)
            .eq("status", "on_my_way")
            .in("event_id", comingUpIds)
        : Promise.resolve({ data: [], error: null }),
      birthdayFriendIds.length > 0
        ? supabase
            .from("profiles")
            .select("display_name,username,birth_month,birth_day")
            .in("id", birthdayFriendIds)
            .not("birth_month", "is", null)
            .not("birth_day", "is", null)
        : Promise.resolve({ data: [], error: null }),
      hangRows.length > 0
        ? supabase
            .from("hang_responses")
            .select("hang_id")
            .eq("user_id", user.id)
            .in("hang_id", hangRows.map((row) => row.id))
        : Promise.resolve({ data: [], error: null }),
      hangCreatorIds.length > 0
        ? supabase
            .from("profiles")
            .select("id,display_name,username")
            .in("id", hangCreatorIds)
        : Promise.resolve({ data: [], error: null }),
    ]);

  // The rows travel to the browser, which turns them into "about 10 min" so
  // no relative time is rendered on the server.
  const onWayArrivals: Record<string, ArrivalRecord> = {};

  for (const row of (arrivalsResult.data ?? []) as ArrivalRecord[]) {
    if (
      row.status === "on_my_way" &&
      row.eta_minutes != null &&
      isArrivalFresh(row.updated_at, now)
    ) {
      onWayArrivals[row.event_id] = row;
    }
  }

  let upcomingBirthday: UpcomingBirthday | null = null;
  let nearestBirthdayDays = Number.POSITIVE_INFINITY;

  if (birthdayProfilesResult.data && birthdayProfilesResult.data.length > 0) {
    for (const profile of (birthdayProfilesResult.data ?? []) as {
      display_name: string | null;
      username: string | null;
      birth_month: number;
      birth_day: number;
    }[]) {
      const days = daysUntilBirthday(
        profile.birth_month,
        profile.birth_day,
        new Date(now)
      );

      if (days >= 0 && days <= 7 && days < nearestBirthdayDays) {
        // Only which birthday is picked is decided here; the countdown itself
        // is the viewer's local day and renders in the browser.
        nearestBirthdayDays = days;
        upcomingBirthday = {
          name: profile.display_name?.trim() || profile.username?.trim() || "A friend",
          month: profile.birth_month,
          day: profile.birth_day,
        };
      }
    }
  }

  const answeredIds = new Set(
    ((hangResponsesResult.data ?? []) as { hang_id: string }[]).map((row) => row.hang_id)
  );
  const unanswered = hangRows.find((row) => !answeredIds.has(row.id));
  const creatorById = new Map(
    ((hangCreatorsResult.data ?? []) as {
      id: string;
      display_name: string | null;
      username: string | null;
    }[]).map((creator) => [creator.id, creator])
  );

  let pendingHang: PendingHang | null = null;

  if (unanswered) {
    const creator = creatorById.get(unanswered.created_by);
    const creatorName =
      creator?.display_name?.trim() || creator?.username?.trim() || "A friend";

    pendingHang = {
      id: unanswered.id,
      creatorName,
      message: unanswered.message,
    };
  }

  const actions = (
    <Link
      href="/events/new"
      aria-label="Add event"
      className="inline-flex h-11 w-11 items-center justify-center rounded-full text-text transition-colors duration-200 ease-out hover:bg-surface-2"
    >
      <CalendarPlus size={24} strokeWidth={1.75} aria-hidden="true" />
    </Link>
  );

  const loadError = eventsResult.error ?? ideasResult.error;

  logDataLoad("/events", dataStartedAt);

  return (
    <AppShell actions={actions} userId={user.id}>
      {loadError ? (
        <p className="text-sm text-muted">
          Couldn&apos;t load events. Refresh and try again.
        </p>
      ) : (
        <div className="space-y-6">
          <HangBanner hang={pendingHang} />
          <LazyPushPrompt userId={user.id} />
          <EventsHome
            userId={user.id}
            initialIdeas={ideasResult.items}
            events={eventsResult.items}
            pollVoteCount={pollCountResult.count}
            comingUpEvents={comingUpEvents}
            onWayArrivals={onWayArrivals}
            upcomingBirthday={upcomingBirthday}
          />
        </div>
      )}
    </AppShell>
  );
}
