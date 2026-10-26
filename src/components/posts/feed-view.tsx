"use client";

import { useEffect, useState, useTransition } from "react";
import { loadMorePostsAction } from "@/app/actions/posts";
import { useAppRefreshSignal } from "@/lib/app-refresh";
import { Button } from "@/components/ui";
import type { FeedPost } from "@/lib/posts";
import { PostCard } from "@/components/posts/post-card";

export function FeedView({
  initialPosts,
  initialHasMore,
}: {
  initialPosts: FeedPost[];
  initialHasMore: boolean;
}) {
  const [posts, setPosts] = useState<FeedPost[]>(initialPosts);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [offset, setOffset] = useState(initialPosts.length);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const refreshSignal = useAppRefreshSignal();

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

  function handleDeleted(postId: string) {
    setPosts((current) => current.filter((post) => post.id !== postId));
    // The server list shifts up by one, so the next page starts one row earlier
    // or it would skip the post that moved into the deleted post's place.
    setOffset((current) => Math.max(0, current - 1));
  }

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
      {posts.length > 0 && (
        <div className="space-y-8">
          {posts.map((post) => (
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
