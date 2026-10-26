"use client";

import { Trophy } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { loadBestOfAction } from "@/app/actions/best-of";
import { BestOfSkeleton } from "@/components/best-of/skeletons";
import { useViewerTimeZone } from "@/components/recap/use-viewer-time-zone";
import { createClient } from "@/lib/supabase/client";
import {
  currentMonthKey,
  sortBestOf,
  type BestOfMonth,
  type BestOfPost,
} from "@/lib/best-of";

export function BestOfGrid({ currentUserId }: { currentUserId: string }) {
  const timeZone = useViewerTimeZone();
  const supabase = useMemo(() => createClient(), []);
  const [data, setData] = useState<BestOfMonth | null>(null);
  const [posts, setPosts] = useState<BestOfPost[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!timeZone) {
      return;
    }

    let cancelled = false;
    const monthKey = currentMonthKey(timeZone);

    void loadBestOfAction(monthKey, timeZone).then((result) => {
      if (cancelled) {
        return;
      }

      if (result.data) {
        setData(result.data);
        // Grid stays in posting order; the top three is sorted separately.
        setPosts(
          [...result.data.posts].sort((a, b) =>
            a.createdAt.localeCompare(b.createdAt)
          )
        );
      } else {
        setError(result.error ?? "Couldn't load this month. Refresh and try again.");
      }
    });

    return () => {
      cancelled = true;
    };
  }, [timeZone]);

  async function toggleVote(post: BestOfPost) {
    if (!data || post.isMine || busy) {
      return;
    }

    const snapshot = posts;
    const previousVoteId = posts.find((item) => item.hasMyVote)?.id ?? null;
    const removing = post.hasMyVote;
    const next = posts.map((item) => {
      let voteCount = item.voteCount;
      let hasMyVote = false;

      if (previousVoteId && item.id === previousVoteId) {
        voteCount = Math.max(0, voteCount - 1);
      }

      if (!removing && item.id === post.id) {
        voteCount += 1;
        hasMyVote = true;
      }

      return { ...item, voteCount, hasMyVote };
    });

    setPosts(next);
    setBusy(true);
    setError(null);

    const monthValue = `${data.monthKey}-01`;
    const { error: writeError } = removing
      ? await supabase
          .from("best_photo_votes")
          .delete()
          .eq("month", monthValue)
          .eq("voter_id", currentUserId)
      : await supabase.from("best_photo_votes").upsert(
          {
            month: monthValue,
            voter_id: currentUserId,
            post_id: post.id,
            created_at: new Date().toISOString(),
          },
          { onConflict: "month,voter_id" }
        );

    setBusy(false);

    if (writeError) {
      setPosts(snapshot);
      setError("Couldn't save that vote. Try again.");
    }
  }

  if (!data) {
    return error ? (
      <p className="text-sm text-muted">{error}</p>
    ) : (
      <BestOfSkeleton />
    );
  }

  const topThree = sortBestOf(posts)
    .filter((post) => post.voteCount > 0)
    .slice(0, 3);

  return (
    <section className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-[28px] font-semibold leading-tight text-text">
          Photo of the month
        </h1>
        <p className="text-sm text-muted">
          {data.monthLabel} · Voting closes {data.closesLabel}
        </p>
      </div>

      {topThree.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-text">Top 3</h2>
          <ol className="border-t border-line">
            {topThree.map((post, index) => (
              <li
                key={post.id}
                className="flex items-center gap-3 border-b border-line py-2"
              >
                <span className="w-4 shrink-0 text-sm text-muted">{index + 1}</span>
                {post.imageUrl ? (
                  <img draggable={false}
                    src={post.imageUrl}
                    alt=""
                    className="h-10 w-10 shrink-0 rounded-lg border border-border object-cover"
                  />
                ) : (
                  <span
                    aria-hidden="true"
                    className="h-10 w-10 shrink-0 rounded-lg border border-border bg-surface"
                  />
                )}
                <span className="min-w-0 flex-1 truncate text-sm text-text">
                  {post.isMine ? "You" : post.authorName}
                </span>
                <span className="shrink-0 text-sm text-muted">{post.voteCount}</span>
              </li>
            ))}
          </ol>
        </section>
      )}

      {data.hasMyPost && (
        <p className="text-sm text-muted">
          Your own photos can&apos;t get your vote.
        </p>
      )}

      {posts.length === 0 ? (
        <p className="text-sm text-muted">No photos this month.</p>
      ) : (
        <ul className="grid grid-cols-2 gap-3">
          {posts.map((post) => (
            <li key={post.id}>
              {post.imageUrl ? (
                <img draggable={false}
                  src={post.imageUrl}
                  alt={post.caption ?? ""}
                  loading="lazy"
                  className="aspect-square w-full rounded-lg border border-border bg-surface object-cover"
                />
              ) : (
                <span
                  aria-hidden="true"
                  className="block aspect-square w-full rounded-lg border border-border bg-surface"
                />
              )}

              <div className="mt-1 flex items-center justify-between gap-1">
                <span className="min-w-0 truncate text-sm text-muted">
                  {post.isMine ? "You" : post.authorName}
                </span>

                {post.isMine ? (
                  <span className="shrink-0 text-sm text-muted">
                    {post.voteCount}
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => void toggleVote(post)}
                    disabled={busy}
                    aria-pressed={post.hasMyVote}
                    aria-label={`${
                      post.hasMyVote ? "Remove your vote" : "Vote for this photo"
                    }. ${post.voteCount} ${
                      post.voteCount === 1 ? "vote" : "votes"
                    }.`}
                    className="inline-flex min-h-11 shrink-0 items-center gap-1 rounded-lg px-2 text-text transition-colors duration-150 ease-out hover:bg-surface disabled:opacity-60 disabled:pointer-events-none cursor-pointer"
                  >
                    <Trophy
                      size={20}
                      strokeWidth={1.5}
                      fill={post.hasMyVote ? "currentColor" : "none"}
                      aria-hidden="true"
                    />
                    <span className="text-sm text-muted">{post.voteCount}</span>
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {error && (
        <p role="alert" className="text-sm text-text">
          {error}
        </p>
      )}
    </section>
  );
}
