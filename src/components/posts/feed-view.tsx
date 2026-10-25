"use client";

import { useState, useTransition } from "react";
import { loadMorePostsAction } from "@/app/actions/posts";
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

  function handleDeleted(postId: string) {
    setPosts((current) => current.filter((post) => post.id !== postId));
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
    <div className="space-y-6">
      {posts.length > 0 && (
        <div className="border-t border-line">
          {posts.map((post) => (
            <PostCard key={post.id} post={post} onDeleted={handleDeleted} />
          ))}
        </div>
      )}

      {posts.length === 0 && !hasMore && (
        <p className="text-sm text-muted">No posts yet. Be the first.</p>
      )}

      {hasMore && (
        <button
          type="button"
          onClick={handleLoadMore}
          disabled={pending}
          className="w-full min-h-11 px-4 py-3 rounded-lg border border-border bg-transparent text-text font-sans font-medium text-sm transition-colors duration-150 ease-out hover:bg-surface cursor-pointer disabled:opacity-60 disabled:pointer-events-none"
        >
          {pending ? "Loading..." : "Load more"}
        </button>
      )}

      {error && (
        <p role="alert" className="text-sm text-text">
          {error}
        </p>
      )}
    </div>
  );
}
