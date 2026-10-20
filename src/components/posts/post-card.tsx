"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { deletePostAction } from "@/app/actions/posts";
import { DeletePostMenu } from "@/components/posts/delete-post-menu";
import { LikeButton } from "@/components/posts/like-button";
import { ProfileAvatar } from "@/components/profile/profile-avatar";
import type { FeedPost } from "@/lib/posts";

export function PostCard({
  post,
  onDeleted,
}: {
  post: FeedPost;
  onDeleted: (postId: string) => void;
}) {
  const [imageFailed, setImageFailed] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const alt = post.caption
    ? `Post by ${post.authorName}: ${post.caption}`
    : `Post by ${post.authorName}`;
  const authorDetails = (
    <div className="min-w-0 flex-1">
      {post.authorUsername ? (
        <Link
          href={`/u/${encodeURIComponent(post.authorUsername)}`}
          className="truncate text-base font-medium text-text hover:opacity-80"
        >
          {post.authorName}
        </Link>
      ) : (
        <p className="truncate text-base font-medium text-text">
          {post.authorName}
        </p>
      )}
      {post.eventId && post.eventTitle && (
        <Link
          href={`/events/${post.eventId}`}
          className="block truncate text-sm text-muted hover:text-text"
        >
          {post.eventTitle}
        </Link>
      )}
      <p className="mt-0.5 text-sm text-muted">{post.relativeTime}</p>
    </div>
  );
  const authorContent = (
    <>
      <ProfileAvatar
        src={post.authorAvatarUrl}
        initial={post.authorInitial}
        size={36}
      />
      {authorDetails}
    </>
  );

  function handleDelete() {
    setDeleteError(null);

    startTransition(async () => {
      try {
        const result = await deletePostAction(post.id);

        if (result.error) {
          setDeleteError(result.error);
          return;
        }

        onDeleted(post.id);
      } catch {
        setDeleteError("Couldn't delete that post. Try again.");
      }
    });
  }

  return (
    <article className="border-b border-line py-6">
      <div className="flex items-center gap-3">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          {authorContent}
        </div>

        {post.isOwner && (
          <DeletePostMenu
            onDeleteRequested={() => {
              setConfirming(true);
              setDeleteError(null);
            }}
          />
        )}
      </div>

      {confirming && (
        <div className="mt-3 rounded-lg border border-line bg-surface p-4 space-y-3">
          <p className="text-sm text-text">
            Delete this post? It can&apos;t be undone.
          </p>

          {deleteError && (
            <p role="alert" className="text-sm text-text">
              {deleteError}
            </p>
          )}

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleDelete}
              disabled={pending}
              className="min-h-11 px-4 py-3 rounded-lg bg-text text-white font-sans font-medium text-sm transition-opacity duration-150 ease-out hover:opacity-90 cursor-pointer disabled:opacity-60 disabled:pointer-events-none"
            >
              {pending ? "Deleting..." : "Delete"}
            </button>

            <button
              type="button"
              onClick={() => {
                setConfirming(false);
                setDeleteError(null);
              }}
              disabled={pending}
              className="min-h-11 px-4 py-3 rounded-lg border border-line bg-transparent text-text font-sans font-medium text-sm transition-colors duration-150 ease-out hover:bg-background cursor-pointer disabled:opacity-60 disabled:pointer-events-none"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {post.imageUrl && !imageFailed ? (
        <img
          src={post.imageUrl}
          alt={alt}
          loading="lazy"
          decoding="async"
          onError={() => setImageFailed(true)}
          className="mt-3 w-full h-auto rounded-lg bg-surface"
        />
      ) : (
        <p className="mt-3 text-sm text-muted">Photo unavailable.</p>
      )}

      <div className="mt-3">
        <LikeButton
          postId={post.id}
          initialLiked={post.hasLiked}
          initialCount={post.likeCount}
        />
      </div>

      {post.caption && (
        <p className="mt-2 whitespace-pre-wrap break-words text-base text-text">
          {post.caption}
        </p>
      )}
    </article>
  );
}
