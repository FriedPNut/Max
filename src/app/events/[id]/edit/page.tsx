import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { AppShell, getAuthenticatedUser } from "@/components/app-shell";
import { EventForm } from "@/components/event-form";
import { updateEventAction } from "@/app/actions/events";
import { createClient } from "@/lib/supabase/server";
import {
  EVENT_SIGNED_URL_SECONDS,
  EVENTS_BUCKET,
  type EventRecord,
} from "@/lib/events";

export default async function EditEventPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { user } = await getAuthenticatedUser();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("events")
    .select(
      "id,title,description,location,starts_at,created_by,created_at,cover_path,capacity,recurrence,series_id,poll_open"
    )
    .eq("id", id)
    .maybeSingle();

  const event = data as EventRecord | null;

  if (error || !event || event.created_by !== user.id) {
    notFound();
  }

  let coverUrl: string | null = null;

  if (event.cover_path) {
    const { data: signed } = await supabase.storage
      .from(EVENTS_BUCKET)
      .createSignedUrl(event.cover_path, EVENT_SIGNED_URL_SECONDS);
    coverUrl = signed?.signedUrl ?? null;
  }

  return (
    <AppShell noIsland>
      <section className="space-y-8">
        <div>
          <Link
            href={`/events/${event.id}`}
            className="inline-flex min-h-11 items-center gap-1.5 text-sm text-muted hover:text-text transition-colors duration-200 ease-out mb-6"
          >
            <ArrowLeft size={24} strokeWidth={1.75} aria-hidden="true" />
            Event
          </Link>
          <h1 className="text-[22px] font-bold leading-tight text-text">
            Edit event
          </h1>
        </div>

        <EventForm
          key={event.id}
          mode="edit"
          action={updateEventAction.bind(null, event.id)}
          cancelHref={`/events/${event.id}`}
          initialValues={{
            title: event.title,
            description: event.description,
            location: event.location,
            capacity: event.capacity,
          }}
          initialStartsAt={event.starts_at}
          userId={user.id}
          initialCoverPath={event.cover_path}
          coverUrl={coverUrl}
          hasSeries={Boolean(event.series_id)}
        />
      </section>
    </AppShell>
  );
}
