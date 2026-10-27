"use client";

import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useState } from "react";
import { loadBestOfAction } from "@/app/actions/best-of";
import { BestOfResultSkeleton } from "@/components/best-of/skeletons";
import { useViewerTimeZone } from "@/components/recap/use-viewer-time-zone";
import { addMonthsToKey, type BestOfMonth } from "@/lib/best-of";
import { useToday } from "@/lib/use-today";

function localMonthKey(now: Date) {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export function BestOfResult({ monthKey }: { monthKey: string }) {
  const timeZone = useViewerTimeZone();
  const today = useToday();
  const currentKey = today ? localMonthKey(today) : null;
  const [data, setData] = useState<BestOfMonth | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!timeZone || !currentKey || monthKey >= currentKey) {
      return;
    }

    let cancelled = false;

    void loadBestOfAction(monthKey, timeZone).then((result) => {
      if (cancelled) {
        return;
      }

      if (result.data) {
        setData(result.data);
      } else {
        setError(result.error ?? "Couldn't load that month. Refresh and try again.");
      }
    });

    return () => {
      cancelled = true;
    };
  }, [currentKey, monthKey, timeZone]);

  const previousKey = addMonthsToKey(monthKey, -1);
  const nextKey = addMonthsToKey(monthKey, 1);
  const canGoPrevious = previousKey >= "2000-01";
  const canGoNext = currentKey !== null && nextKey < currentKey;

  const arrows = (
    <div className="flex shrink-0 items-center gap-1">
      {canGoPrevious ? (
        <Link
          href={`/best-of/${previousKey}`}
          aria-label="Previous month"
          className="inline-flex h-11 w-11 items-center justify-center rounded-lg text-text transition-colors duration-200 ease-out hover:bg-surface-2"
        >
          <ChevronLeft size={24} strokeWidth={1.75} aria-hidden="true" />
        </Link>
      ) : (
        <span
          aria-hidden="true"
          className="inline-flex h-11 w-11 items-center justify-center rounded-lg text-muted opacity-40"
        >
          <ChevronLeft size={24} strokeWidth={1.75} />
        </span>
      )}

      {canGoNext ? (
        <Link
          href={`/best-of/${nextKey}`}
          aria-label="Next month"
          className="inline-flex h-11 w-11 items-center justify-center rounded-lg text-text transition-colors duration-200 ease-out hover:bg-surface-2"
        >
          <ChevronRight size={24} strokeWidth={1.75} aria-hidden="true" />
        </Link>
      ) : (
        <span
          aria-hidden="true"
          className="inline-flex h-11 w-11 items-center justify-center rounded-lg text-muted opacity-40"
        >
          <ChevronRight size={24} strokeWidth={1.75} />
        </span>
      )}
    </div>
  );

  if (currentKey !== null && monthKey >= currentKey) {
    const isCurrent = monthKey === currentKey;

    return (
      <section className="space-y-6">
        <Link
          href="/best-of"
          className="inline-flex min-h-11 items-center gap-1.5 text-sm text-muted transition-colors duration-200 ease-out hover:text-text"
        >
          <ChevronLeft size={24} strokeWidth={1.75} aria-hidden="true" />
          This month
        </Link>

        <p className="text-sm text-muted">
          {isCurrent
            ? "Voting is still open."
            : "That month hasn't happened yet."}
        </p>
      </section>
    );
  }

  if (!data) {
    return error ? (
      <section className="space-y-6">
        <p className="text-sm text-muted">{error}</p>
      </section>
    ) : (
      <BestOfResultSkeleton />
    );
  }

  const winner = data.posts.find((post) => post.voteCount > 0) ?? null;
  const runnersUp = data.posts
    .filter((post) => post.voteCount > 0 && post.id !== winner?.id)
    .slice(0, 5);

  return (
    <section className="space-y-8">
      <div className="space-y-6">
        <Link
          href="/best-of"
          className="inline-flex min-h-11 items-center gap-1.5 text-sm text-muted transition-colors duration-200 ease-out hover:text-text"
        >
          <ChevronLeft size={24} strokeWidth={1.75} aria-hidden="true" />
          This month
        </Link>

        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm text-muted">{data.monthLabel}</p>
          </div>
          {arrows}
        </div>
      </div>

      {data.totalVotes === 0 || !winner ? (
        <p className="text-sm text-muted">No votes that month</p>
      ) : (
        <>
          <article className="space-y-3">
            {winner.imageUrl && (
              <img draggable={false}
                src={winner.imageUrl}
                alt={winner.caption ?? ""}
                className="w-full rounded-[10px] bg-surface-2 object-cover"
              />
            )}

            <div>
              <p className="text-base font-semibold text-text">
                {winner.isMine ? "You" : winner.authorName}
              </p>
              <p className="mt-1 text-sm text-muted">
                {winner.voteCount} {winner.voteCount === 1 ? "vote" : "votes"}
              </p>
              {winner.caption && (
                <p className="mt-2 whitespace-pre-wrap break-words text-base text-text">
                  {winner.caption}
                </p>
              )}
            </div>
          </article>

          {runnersUp.length > 0 && (
            <section className="space-y-2">
              <h2 className="text-lg font-semibold text-text">Runners-up</h2>
              <ul className="border-t border-line">
                {runnersUp.map((post) => (
                  <li
                    key={post.id}
                    className="flex min-h-14 items-center gap-3 border-b border-line py-3"
                  >
                    {post.imageUrl ? (
                      <img draggable={false}
                        src={post.imageUrl}
                        alt=""
                        loading="lazy"
                        className="h-12 w-12 shrink-0 rounded-[10px] bg-surface-2 object-cover"
                      />
                    ) : (
                      <span
                        aria-hidden="true"
                        className="h-12 w-12 shrink-0 rounded-[10px] bg-surface-2"
                      />
                    )}
                    <span className="min-w-0 flex-1 truncate text-base font-semibold text-text">
                      {post.isMine ? "You" : post.authorName}
                    </span>
                    <span className="shrink-0 text-sm text-muted">
                      {post.voteCount}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </section>
  );
}
