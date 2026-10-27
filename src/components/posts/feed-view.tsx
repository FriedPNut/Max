"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { loadMorePostsAction } from "@/app/actions/posts";
import { useAppRefreshSignal } from "@/lib/app-refresh";
import { readCache, writeCache } from "@/lib/cache";
import { Button } from "@/components/ui";
import type { FeedPost } from "@/lib/posts";
import { PostCard } from "@/components/posts/post-card";

/** Per account, so two people on one device never share "already seen". */
function feedSeenKey(userId: string) {
  return `max-feed-seen:${userId}`;
}

function readFeedSeen(userId: string): number {
  try {
    const value = Number(window.localStorage.getItem(feedSeenKey(userId)));
    return Number.isFinite(value) ? value : 0;
  } catch {
    return 0;
  }
}

function writeFeedSeen(userId: string, time: number) {
  try {
    window.localStorage.setItem(feedSeenKey(userId), String(time));
  } catch {
    // Private mode can refuse storage; the block still renders this visit.
  }
}

function CaughtUpBlock() {
  return (
    <div className="flex items-center gap-3 px-1">
      <span
        aria-hidden="true"
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-surface-2"
      >
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-text">
          <path d="M5 12.5l4.5 4.5L19 7.5" />
        </svg>
      </span>
      <p className="text-[15px] text-muted">
        You&apos;ve seen the latest posts from friends.
      </p>
    </div>
  );
}

export function FeedView({
  userId,
  initialPosts,
  initialHasMore,
}: {
  userId: string;
  initialPosts: FeedPost[];
  initialHasMore: boolean;
}) {
  const [posts, setPosts] = useState<FeedPost[]>(initialPosts);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [offset, setOffset] = useState(initialPosts.length);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const refreshSignal = useAppRefreshSignal();
  const [seenAt] = useState<number>(() =>
    typeof window === "undefined" ? 0 : readFeedSeen(userId)
  );

  useEffect(() => {
    const save = () => writeFeedSeen(userId, Date.now());
    window.addEventListener("pagehide", save);
    return () => {
      save();
      window.removeEventListener("pagehide", save);
    };
  }, [userId]);

  // The last first page is on this device already: show it when the server
  // hasn't delivered yet, and keep the copy current whenever it has.
  useEffect(() => {
    if (posts.length > 0) {
      writeCache(userId, "feed", posts.slice(0, 12));
      return;
    }

    const cached = readCache<FeedPost[]>(userId, "feed");

    if (cached && cached.length > 0) {
      setPosts(cached);
      setHasMore(false);
    }
  }, [posts, userId]);

  const newPosts = posts.filter(
    (post) => new Date(post.createdAt).getTime() > seenAt
  );
  const olderPosts = posts.filter(
    (post) => new Date(post.createdAt).getTime() <= seenAt
  );

  // Pull-to-refresh re-fetches the server page; adopt its fresh props.
  useEffect(() => {
    if (!refreshSignal) {
      return;
    }

    setPosts(initialPosts);
    setHasMore(initialHasMore);
    setOffset(initialPosts.length);
    setError(null);
  }, [refreshSignal, initialPosts, initialHasMore]);

  const handleDeleted = useCallback((postId: string) => {
    setPosts((current) => current.filter((post) => post.id !== postId));
    // The server list shifts up by one, so the next page starts one row earlier
    // or it would skip the post that moved into the deleted post's place.
    setOffset((current) => Math.max(0, current - 1));
  }, []);

  function handleLoadMore() {
    if (pending || !hasMore) {
      return;
    }

    setError(null);

    startTransition(async () => {
      try {
        const result = await loadMorePostsAction(offset);

        if (result.error) {
          setError(result.error);
          return;
        }

        setPosts((current) => {
          const existingIds = new Set(current.map((post) => post.id));

          return [
            ...current,
            ...result.posts.filter((post) => !existingIds.has(post.id)),
          ];
        });
        setOffset((current) => current + result.posts.length);
        setHasMore(result.hasMore);
      } catch {
        setError("Couldn't load more posts. Try again.");
      }
    });
  }

  return (
    <div className="space-y-8">
      {newPosts.length > 0 && (
        <div className="space-y-8">
          {newPosts.map((post) => (
            <PostCard key={post.id} post={post} onDeleted={handleDeleted} />
          ))}
        </div>
      )}

      <CaughtUpBlock />

      {olderPosts.length > 0 && (
        <div className="space-y-8">
          <h2 className="text-[18px] font-bold text-text">Older posts</h2>
          {olderPosts.map((post) => (
            <PostCard key={post.id} post={post} onDeleted={handleDeleted} />
          ))}
        </div>
      )}

      {posts.length === 0 && !hasMore && (
        <p className="text-sm text-muted">No posts yet. Be the first.</p>
      )}

      {hasMore && (
        <Button
          variant="secondary"
          onClick={handleLoadMore}
          disabled={pending}
          className="w-full"
        >
          {pending ? "Loading..." : "Load more"}
        </Button>
      )}

      {error && (
        <p role="alert" className="text-sm text-text">
          {error}
        </p>
      )}
    </div>
  );
}
