import Link from "next/link";
import { LocalTime } from "@/components/local-time";
import type { EventListItem } from "@/lib/events";

export function EventRow({
  event,
  muted = false,
}: {
  event: EventListItem;
  muted?: boolean;
}) {
  return (
    <Link
      href={`/events/${event.id}`}
      className="flex items-center gap-3 border-b border-line py-4 transition-colors duration-150 ease-out hover:bg-surface"
    >
      {event.coverUrl && (
        <img
          src={event.coverUrl}
          alt=""
          loading="lazy"
          decoding="async"
          className="h-12 w-12 shrink-0 rounded-lg border border-border bg-surface object-cover"
        />
      )}

      <div className="min-w-0 flex-1">
        <p
          className={`text-base font-medium break-words ${
            muted ? "text-muted" : "text-text"
          }`}
        >
          {event.title}
        </p>
        <p className="mt-1 text-sm text-muted break-words">
          {event.poll_open ? (
            "Time to be decided"
          ) : (
            <LocalTime iso={event.starts_at} format="card" />
          )}
          {" · "}
          {event.location}
        </p>
      </div>

      <span className="shrink-0 text-sm text-muted">
        {event.poll_open ? "Poll" : `${event.goingCount} going`}
      </span>
    </Link>
  );
}
