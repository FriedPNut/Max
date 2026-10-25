"use client";

import Link from "next/link";
import { MessageCircle } from "lucide-react";
import { useState, useTransition } from "react";
import { deletePostAction } from "@/app/actions/posts";
import { DeletePostMenu } from "@/components/posts/delete-post-menu";
import { LikeButton } from "@/components/posts/like-button";
import { ProfileAvatar } from "@/components/profile/profile-avatar";
import type { FeedPost } from "@/lib/posts";

export function PostCard({
  post,
  onDeleted,
  showComments = true,
}: {
  post: FeedPost;
  onDeleted: (postId: string) => void;
  // Hidden on the post's own page, where the full comment list follows.
  showComments?: boolean;
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
        <div className="mt-3 rounded-lg border border-border bg-surface p-4 space-y-3">
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
              className="min-h-11 px-4 py-3 rounded-lg bg-text text-background font-sans font-medium text-sm transition-opacity duration-150 ease-out hover:opacity-90 cursor-pointer disabled:opacity-60 disabled:pointer-events-none"
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
              className="min-h-11 px-4 py-3 rounded-lg border border-border bg-transparent text-text font-sans font-medium text-sm transition-colors duration-150 ease-out hover:bg-background cursor-pointer disabled:opacity-60 disabled:pointer-events-none"
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

      <div className="mt-3 flex items-center gap-6">
        <LikeButton
          postId={post.id}
          initialLiked={post.hasLiked}
          initialCount={post.likeCount}
        />

        <Link
          href={`/feed/${post.id}`}
          aria-label={`${post.commentCount} ${
            post.commentCount === 1 ? "comment" : "comments"
          }`}
          className="inline-flex min-h-11 items-center gap-2 text-text transition-opacity duration-150 ease-out hover:opacity-80"
        >
          <MessageCircle size={20} strokeWidth={1.5} aria-hidden="true" />
          <span className="text-sm text-muted">{post.commentCount}</span>
        </Link>
      </div>

      {post.caption && (
        <p className="mt-2 whitespace-pre-wrap break-words text-base text-text">
          {post.caption}
        </p>
      )}

      {showComments && post.previewComments.length > 0 && (
        <ul className="mt-2 space-y-1">
          {post.previewComments.map((comment) => (
            <li key={comment.id} className="line-clamp-2 text-sm text-text">
              <span className="font-medium">{comment.authorName}</span>{" "}
              <span className="break-words">{comment.body}</span>
            </li>
          ))}
        </ul>
      )}

      {showComments && post.commentCount > post.previewComments.length && (
        <Link
          href={`/feed/${post.id}`}
          className="mt-1 inline-flex min-h-11 items-center text-sm text-muted transition-colors duration-150 ease-out hover:text-text"
        >
          View all {post.commentCount} comments
        </Link>
      )}
    </article>
  );
}
