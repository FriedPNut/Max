import Link from "next/link";
import { LocalTime } from "@/components/local-time";
import type { ProfileEvent } from "@/lib/profile";

export function ProfileEvents({
  upcoming,
  past,
}: {
  upcoming: ProfileEvent[];
  past: ProfileEvent[];
}) {
  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-text">Upcoming</h2>

        {upcoming.length === 0 ? (
          <p className="text-sm text-muted">No upcoming events.</p>
        ) : (
          <div className="border-t border-line">
            {upcoming.map((event) => (
              <EventRow key={event.id} event={event} />
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-text">Past</h2>

        {past.length === 0 ? (
          <p className="text-sm text-muted">No past events.</p>
        ) : (
          <div className="border-t border-line">
            {past.map((event) => (
              <EventRow key={event.id} event={event} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function EventRow({ event }: { event: ProfileEvent }) {
  return (
    <Link
      href={`/events/${event.id}`}
      className="block border-b border-line py-3 transition-colors duration-150 ease-out hover:bg-surface"
    >
      <p className="text-base font-medium text-text break-words">
        {event.title}
      </p>
      <p className="mt-1 text-sm text-muted break-words">
        <LocalTime iso={event.startsAt} format="card" />
        {" · "}
        {event.location}
      </p>
    </Link>
  );
}
