import { buildEventIcs } from "@/lib/event-calendar";
import { createClient } from "@/lib/supabase/server";

type EventCalendarRecord = {
  id: string;
  title: string;
  description: string | null;
  location: string;
  starts_at: string;
  poll_open: boolean;
};

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { data, error } = await supabase
    .from("events")
    .select("id,title,description,location,starts_at,poll_open")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    return new Response("Couldn't load that event.", { status: 500 });
  }

  const event = data as EventCalendarRecord | null;

  if (!event) {
    return new Response("Event not found.", { status: 404 });
  }

  if (event.poll_open) {
    return new Response("This event needs a time before it can be added.", {
      status: 409,
    });
  }

  const forwardedHost = request.headers
    .get("x-forwarded-host")
    ?.split(",")[0]
    .trim();
  const host = forwardedHost ?? request.headers.get("host");
  const forwardedProto = request.headers
    .get("x-forwarded-proto")
    ?.split(",")[0]
    .trim();
  const fallbackUrl = new URL(request.url);
  const protocol = forwardedProto || fallbackUrl.protocol.replace(":", "");
  const origin = host ? `${protocol}://${host}` : fallbackUrl.origin;
  const eventUrl = `${origin}/events/${event.id}`;
  const ics = buildEventIcs({
    eventId: event.id,
    title: event.title,
    description: event.description,
    location: event.location,
    startsAt: event.starts_at,
    eventUrl,
  });

  return new Response(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'attachment; filename="event.ics"',
      "Cache-Control": "private, no-store",
    },
  });
}
