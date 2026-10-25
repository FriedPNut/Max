"use client";

import Link from "next/link";
import { ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useState } from "react";
import { loadRecapAction } from "@/app/actions/recap";
import { RecapSkeleton } from "@/components/recap/skeletons";
import { useViewerTimeZone } from "@/components/recap/use-viewer-time-zone";
import { formatEventDay, formatEventTime, type RecapWeek } from "@/lib/recap";

export function RecapView() {
  const timeZone = useViewerTimeZone();
  const [offset, setOffset] = useState(0);
  const [data, setData] = useState<RecapWeek | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!timeZone) {
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    void loadRecapAction(offset, timeZone).then((result) => {
      if (cancelled) {
        return;
      }

      if (result.data) {
        setData(result.data);
      } else {
        setError(result.error ?? "Couldn't load your week. Refresh and try again.");
      }

      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [offset, timeZone]);

  if (!data) {
    return error ? (
      <section className="space-y-6">
        <BackLink />
        <p className="text-sm text-muted">{error}</p>
      </section>
    ) : (
      <RecapSkeleton />
    );
  }

  const stats: { label: string; value: string }[] = [];

  if (data.eventsAttended > 0) {
    stats.push({
      label: data.eventsAttended === 1 ? "Event attended" : "Events attended",
      value: String(data.eventsAttended),
    });
  }

  if (data.newEvents > 0) {
    stats.push({
      label: data.newEvents === 1 ? "New event from the group" : "New events from the group",
      value: String(data.newEvents),
    });
  }

  if (data.posts > 0) {
    stats.push({
      label: data.posts === 1 ? "Post" : "Posts",
      value: String(data.posts),
    });
  }

  if (data.photos > 0) {
    stats.push({
      label: data.photos === 1 ? "Photo shared" : "Photos shared",
      value: String(data.photos),
    });
  }

  if (data.messages > 0) {
    stats.push({
      label: data.messages === 1 ? "Message sent" : "Messages sent",
      value: String(data.messages),
    });
  }

  if (data.newFriends > 0) {
    stats.push({
      label: data.newFriends === 1 ? "New friend" : "New friends",
      value: String(data.newFriends),
    });
  }

  if (data.busiestDay) {
    stats.push({ label: "Busiest day", value: data.busiestDay.label });
  }

  return (
    <section className="space-y-8">
      <div className="space-y-6">
        <BackLink />

        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-[28px] font-semibold leading-tight text-text">
              Your week
            </h1>
            <p className="mt-1 text-sm text-muted">
              {data.weekLabel}
              {data.isCurrentWeek ? " · This week" : ""}
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={() => setOffset((current) => Math.max(-104, current - 1))}
              disabled={loading}
              aria-label="Previous week"
              className="inline-flex h-11 w-11 items-center justify-center rounded-lg text-text transition-colors duration-150 ease-out hover:bg-surface disabled:opacity-60 disabled:pointer-events-none cursor-pointer"
            >
              <ChevronLeft size={20} strokeWidth={1.5} aria-hidden="true" />
            </button>

            <button
              type="button"
              onClick={() => setOffset((current) => Math.min(0, current + 1))}
              disabled={loading || offset === 0}
              aria-label="Next week"
              className="inline-flex h-11 w-11 items-center justify-center rounded-lg text-text transition-colors duration-150 ease-out hover:bg-surface disabled:opacity-60 disabled:pointer-events-none cursor-pointer"
            >
              <ChevronRight size={20} strokeWidth={1.5} aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>

      {data.isEmpty ? (
        <p className="text-sm text-muted">A quiet week.</p>
      ) : (
        stats.length > 0 && (
          <ul className="border-t border-line">
            {stats.map((stat) => (
              <li
                key={stat.label}
                className="flex min-h-11 items-center justify-between gap-3 border-b border-line py-3"
              >
                <span className="text-base text-muted">{stat.label}</span>
                <span className="shrink-0 text-base text-text">{stat.value}</span>
              </li>
            ))}
          </ul>
        )
      )}

      {data.topPost && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-text">Most-liked post</h2>
          <Link
            href={`/feed/${data.topPost.id}`}
            className="flex items-center gap-3"
          >
            {data.topPost.imageUrl ? (
              <img
                src={data.topPost.imageUrl}
                alt=""
                className="h-14 w-14 shrink-0 rounded-lg border border-border bg-surface object-cover"
              />
            ) : (
              <span
                aria-hidden="true"
                className="h-14 w-14 shrink-0 rounded-lg border border-border bg-surface"
              />
            )}
            <span className="min-w-0">
              <span className="block truncate text-base text-text">
                {data.topPost.authorName}
              </span>
              <span className="mt-0.5 block text-sm text-muted">
                {data.topPost.likeCount}{" "}
                {data.topPost.likeCount === 1 ? "like" : "likes"}
              </span>
            </span>
          </Link>
        </section>
      )}

      {data.nextWeek.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-text">Coming up next week</h2>
          <ul className="border-t border-line">
            {data.nextWeek.map((event) => (
              <li key={event.id} className="border-b border-line">
                <Link
                  href={`/events/${event.id}`}
                  className="flex min-h-11 items-center justify-between gap-3 py-3 transition-colors duration-150 ease-out hover:text-muted"
                >
                  <span className="min-w-0 truncate text-base text-text">
                    {event.title}
                  </span>
                  <span className="shrink-0 text-sm text-muted">
                    {formatEventDay(event.startsAt, timeZone ?? "UTC")} ·{" "}
                    {formatEventTime(event.startsAt, timeZone ?? "UTC")}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {error && (
        <p role="alert" className="text-sm text-text">
          {error}
        </p>
      )}
    </section>
  );
}

function BackLink() {
  return (
    <Link
      href="/me"
      className="inline-flex min-h-11 items-center gap-1.5 text-sm text-muted transition-colors duration-150 ease-out hover:text-text"
    >
      <ArrowLeft size={20} strokeWidth={1.5} aria-hidden="true" />
      Profile
    </Link>
  );
}
