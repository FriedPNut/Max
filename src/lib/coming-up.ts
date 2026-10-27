import type { EventListItem } from "@/lib/events";

export function getComingUpEvents(
  events: EventListItem[],
  rsvpStatuses: Map<string, string>,
  now: number
): EventListItem[] {
  const end = now + 24 * 60 * 60 * 1000;

  return events
    .filter((event) => {
      const startsAt = new Date(event.starts_at).getTime();
      const status = rsvpStatuses.get(event.id);
      return !event.poll_open && startsAt >= now && startsAt < end && (status === "going" || status === "maybe");
    })
    .sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime());
}

