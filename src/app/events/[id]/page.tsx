import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { AppShell, getAuthenticatedUser } from "@/components/app-shell";
import { CopyLinkButton } from "@/components/copy-link-button";
import { EventMenu } from "@/components/event-menu";
import { AddToCalendar } from "@/components/events/add-to-calendar";
import { BringTab } from "@/components/events/bring-tab";
import { EventChat } from "@/components/events/event-chat";
import { EventTabs } from "@/components/events/event-tabs";
import { RidesTab } from "@/components/events/rides-tab";
import { CostsTab } from "@/components/events/costs-tab";
import { PhotosTab } from "@/components/events/photos-tab";
import { loadEventCosts } from "@/lib/event-costs-data";
import { loadEventPhotos } from "@/lib/event-photos-data";
import { NewPostButton } from "@/components/posts/new-post-button";
import { EventRsvpPanel } from "@/components/event-rsvp-panel";
import { PollTimePanel } from "@/components/events/poll-time-panel";
import { LocalTime } from "@/components/local-time";
import { buildGoogleCalendarUrl } from "@/lib/event-calendar";
import { loadEventChat } from "@/lib/event-chat-data";
import { loadEventPlan } from "@/lib/event-plan-data";
import { loadRsvpSnapshot } from "@/lib/event-rsvps";
import { loadPollSnapshot } from "@/lib/polls";
import { createClient } from "@/lib/supabase/server";
import {
  EVENT_SIGNED_URL_SECONDS,
  EVENTS_BUCKET,
  RECURRENCE_LABELS,
  type EventRecord,
} from "@/lib/events";

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { user, displayName } = await getAuthenticatedUser();
  const supabase = await createClient();

  const { data: eventData, error: eventError } = await supabase
    .from("events")
    .select(
      "id,title,description,location,starts_at,created_by,created_at,cover_path,capacity,recurrence,series_id,poll_open"
    )
    .eq("id", id)
    .maybeSingle();

  if (eventError) {
    return (
      <AppShell>
        <p className="text-sm text-muted">
          Couldn&apos;t load this event. Refresh and try again.
        </p>
      </AppShell>
    );
  }

  const event = eventData as EventRecord | null;

  if (!event) {
    notFound();
  }

  let coverUrl: string | null = null;

  if (event.cover_path) {
    const { data: signed } = await supabase.storage
      .from(EVENTS_BUCKET)
      .createSignedUrl(event.cover_path, EVENT_SIGNED_URL_SECONDS);
    coverUrl = signed?.signedUrl ?? null;
  }

  const pollResult = event.poll_open
    ? await loadPollSnapshot(supabase, {
        eventId: event.id,
        currentUserId: user.id,
        currentUserName: displayName,
      })
    : null;
  const snapshotResult = event.poll_open
    ? null
    : await loadRsvpSnapshot(supabase, {
        eventId: event.id,
        currentUserId: user.id,
        currentUserName: displayName,
        capacity: event.capacity,
      });
  const chatResult = await loadEventChat(supabase, {
    eventId: event.id,
    currentUserId: user.id,
    currentUserName: displayName,
  });
  const [planResult, costsSnapshot, photosResult, composerEventsResult] = await Promise.all([
    loadEventPlan(supabase, {
      eventId: event.id,
      currentUserId: user.id,
      currentUserName: displayName,
    }),
    loadEventCosts(supabase, event.id, user.id, displayName),
    loadEventPhotos(supabase, event.id, user.id, displayName),
    supabase.from("events").select("id,title,starts_at").gte("starts_at", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()).order("starts_at", { ascending: true }),
  ]);
  const composerEvents = (composerEventsResult.data ?? []).map((item) => ({
    id: String(item.id), title: String(item.title), startsAt: String(item.starts_at),
  }));
  if (!composerEvents.some((item) => item.id === event.id)) {
    composerEvents.push({ id: event.id, title: event.title, startsAt: event.starts_at });
  }

  const headerStore = await headers();
  const host = (headerStore.get("x-forwarded-host") ??
    headerStore.get("host"))?.split(",")[0].trim();
  const forwardedProto = headerStore
    .get("x-forwarded-proto")
    ?.split(",")[0]
    .trim();
  const protocol = forwardedProto || "http";
  const eventUrl = host
    ? `${protocol}://${host}/events/${event.id}`
    : `/events/${event.id}`;
  const googleCalendarUrl = buildGoogleCalendarUrl({
    title: event.title,
    description: event.description,
    location: event.location,
    startsAt: event.starts_at,
    eventUrl,
  });
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    event.location
  )}`;
  const isPast =
    !event.poll_open && new Date(event.starts_at).getTime() < Date.now();
  const isCreator = event.created_by === user.id;

  const detailsContent = (
    <div className="space-y-8">
      {coverUrl && (
        <img
          src={coverUrl}
          alt={`Cover for ${event.title}`}
          className="aspect-video w-full rounded-lg border border-line bg-surface object-cover"
        />
      )}

      <section className="border-t border-line">
        <div className="border-b border-line py-4">
          <p className="text-sm text-muted">When</p>

          {event.poll_open ? (
            <p className="mt-1 text-base text-text">Time to be decided</p>
          ) : (
            <p className="mt-1 text-base text-text">
              <LocalTime iso={event.starts_at} format="date" /> at{" "}
              <LocalTime iso={event.starts_at} format="time" />
            </p>
          )}

          {!event.poll_open && event.recurrence !== "none" && (
            <p className="mt-1 text-sm text-muted">
              {RECURRENCE_LABELS[event.recurrence]}
            </p>
          )}
        </div>

        {event.poll_open && (
          <div className="border-b border-line py-4">
            {pollResult?.snapshot ? (
              <PollTimePanel
                eventId={event.id}
                currentUserId={user.id}
                isCreator={isCreator}
                initialSnapshot={pollResult.snapshot}
              />
            ) : (
              <p className="text-sm text-muted">
                {pollResult?.error ??
                  "Couldn't load the time options. Refresh and try again."}
              </p>
            )}
          </div>
        )}

        <div className="border-b border-line py-4">
          <p className="text-sm text-muted">Where</p>
          <Link
            href={mapsUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-1 inline-flex flex-col text-base text-text transition-opacity duration-150 ease-out hover:opacity-80"
          >
            <span className="break-words whitespace-pre-line">
              {event.location}
            </span>
            <span className="mt-1 text-sm text-muted">Open in Maps</span>
          </Link>
        </div>

        {event.description && (
          <div className="border-b border-line py-4">
            <p className="text-sm text-muted">Details</p>
            <p className="mt-1 text-base text-text leading-relaxed whitespace-pre-line break-words">
              {event.description}
            </p>
          </div>
        )}
      </section>

      {!event.poll_open && (
        <div>
          <AddToCalendar
            googleUrl={googleCalendarUrl}
            icsHref={`/events/${event.id}/calendar.ics`}
          />
        </div>
      )}

      {event.poll_open ? (
        <p className="text-sm text-muted">
          RSVP opens when a time is picked.
        </p>
      ) : snapshotResult?.snapshot ? (
        <EventRsvpPanel
          eventId={event.id}
          isPast={isPast}
          currentUserId={user.id}
          initialSnapshot={snapshotResult.snapshot}
        />
      ) : (
        <p className="text-sm text-muted">
          {snapshotResult?.error ??
            "Couldn't load who's coming. Refresh and try again."}
        </p>
      )}
    </div>
  );

  const chatContent = (
    <EventChat
      eventId={event.id}
      currentUserId={user.id}
      currentUserName={displayName}
      initialMessages={chatResult.messages}
      initialProfiles={chatResult.profiles}
      initialHasMore={chatResult.hasMore}
      initialError={chatResult.error}
    />
  );

  return (
    <AppShell>
      <article className="space-y-6">
        <header>
          <div className="mb-6 flex items-center justify-between gap-2">
            <Link
              href="/events"
              className="inline-flex min-h-11 items-center gap-1.5 text-sm text-muted hover:text-text transition-colors duration-150 ease-out"
            >
              <ArrowLeft size={20} strokeWidth={1.5} aria-hidden="true" />
              Events
            </Link>

            <div className="flex items-center gap-1">
              <CopyLinkButton />
              {isCreator && (
                <EventMenu
                  eventId={event.id}
                  hasSeries={Boolean(event.series_id)}
                />
              )}
            </div>
          </div>

          <p className="text-sm text-muted">
            {event.poll_open ? "Needs a time" : isPast ? "Past" : "Upcoming"}
          </p>

          <h1 className="mt-1 text-[28px] font-semibold leading-tight text-text break-words">
            {event.title}
          </h1>

          {event.poll_open ? (
            <p className="mt-2 text-sm text-muted">Time to be decided</p>
          ) : (
            <LocalTime
              iso={event.starts_at}
              format="card"
              className="mt-2 block text-sm text-muted"
            />
          )}
        </header>

        <EventTabs
          key={event.id}
          tabs={[
            { id: "details", label: "Details", content: detailsContent },
            { id: "chat", label: "Chat", content: chatContent },
            {
              id: "bring",
              label: "Bring",
              content: (
                <BringTab
                  eventId={event.id}
                  eventCreatorId={event.created_by}
                  currentUserId={user.id}
                  initialSnapshot={planResult}
                />
              ),
            },
            {
              id: "rides",
              label: "Rides",
              content: (
                <RidesTab
                  eventId={event.id}
                  currentUserId={user.id}
                  initialSnapshot={planResult}
                />
              ),
            },
            {
              id: "costs",
              label: "Costs",
              content: <CostsTab eventId={event.id} currentUserId={user.id} initialSnapshot={costsSnapshot} />,
            },
            {
              id: "photos",
              label: "Photos",
              content: <section className="space-y-4"><div className="flex items-start justify-between gap-3"><h2 className="text-lg font-semibold text-text">Photos</h2><NewPostButton userId={user.id} eventId={event.id} events={composerEvents} buttonLabel="Add photos" /></div><PhotosTab photos={photosResult.photos} error={photosResult.error} /></section>,
            },
          ]}
        />
      </article>
    </AppShell>
  );
}
