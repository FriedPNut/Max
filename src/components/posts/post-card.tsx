"use client";

import Link from "next/link";
import { ChevronLeft, ChevronRight, Heart, MessageCircle } from "lucide-react";
import { useEffect, useRef, useState, useTransition } from "react";
import { deletePostAction } from "@/app/actions/posts";
import { DeletePostMenu } from "@/components/posts/delete-post-menu";
import { PostCommentsSheet } from "@/components/posts/post-comments-sheet";
import { PostCopyLinkButton } from "@/components/posts/post-copy-link-button";
import { PostLikeButton } from "@/components/posts/post-like-button";
import { Avatar, Button } from "@/components/ui";
import type { LikeButtonHandle } from "@/components/ui/like-button";
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
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [commentCount, setCommentCount] = useState(post.commentCount ?? 0);
  const [likeCount, setLikeCount] = useState(post.likeCount ?? 0);
  const [expanded, setExpanded] = useState(false);
  const [imageIndex, setImageIndex] = useState(0);
  const likeRef = useRef<LikeButtonHandle | null>(null);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const lastTap = useRef<number | null>(null);
  const lastDoubleTap = useRef(0);
  const heartTimer = useRef<number | null>(null);
  const [heart, setHeart] = useState<{ key: number } | null>(null);

  useEffect(() => {
    return () => {
      if (heartTimer.current !== null) {
        window.clearTimeout(heartTimer.current);
      }
    };
  }, []);

  const imageUrls = post.imageUrls ?? [];
  const images =
    imageUrls.length > 0
      ? imageUrls
      : post.imageUrl
      ? [post.imageUrl]
      : [];
  const hasPhotos = images.length > 0 && !imageFailed;
  const isTextOnly = !post.imageUrl && Boolean(post.caption);
  const captionIsLong =
    (post.caption?.length ?? 0) > 110 || (post.caption?.includes("\n") ?? false);
  const alt = post.caption
    ? `Post by ${post.authorName}: ${post.caption}`
    : `Post by ${post.authorName}`;

  function showDoubleTapHeart() {
    const now = Date.now();

    // A double tap also fires dblclick; only animate once.
    if (now - lastDoubleTap.current < 400) {
      return;
    }

    lastDoubleTap.current = now;
    setHeart({ key: now });
    likeRef.current?.like();

    if (heartTimer.current !== null) {
      window.clearTimeout(heartTimer.current);
    }

    heartTimer.current = window.setTimeout(() => setHeart(null), 700);
  }

  function handlePhotoClick(event: React.MouseEvent<HTMLDivElement>) {
    // Arrows and dots are controls, not part of the photo.
    if ((event.target as Element).closest("button")) {
      return;
    }

    const now = Date.now();

    if (lastTap.current !== null && now - lastTap.current < 300) {
      lastTap.current = null;
      showDoubleTapHeart();
      return;
    }

    lastTap.current = now;
  }


  function handleScroll(event: React.UIEvent<HTMLDivElement>) {
    const width = event.currentTarget.clientWidth;

    if (!width) {
      return;
    }

    setImageIndex(
      Math.min(
        images.length - 1,
        Math.max(0, Math.round(event.currentTarget.scrollLeft / width))
      )
    );
  }

  function handleCarouselKey(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      goToImage(Math.max(0, imageIndex - 1));
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      goToImage(Math.min(images.length - 1, imageIndex + 1));
    }
  }

  function goToImage(index: number) {
    const track = trackRef.current;

    if (!track) {
      return;
    }

    track.scrollTo({ left: index * track.clientWidth, behavior: "smooth" });
    setImageIndex(index);
  }

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

  const commentButton = (
    <>
      <MessageCircle size={24} strokeWidth={1.75} aria-hidden="true" />
    </>
  );

  return (
    <article className="space-y-2.5">
      <div className="flex items-center gap-3 px-1">
        <Avatar
          src={post.authorAvatarUrl}
          initial={post.authorInitial}
          size={40}
        />

        <div className="min-w-0 flex-1">
          {post.authorUsername ? (
            <Link
              href={`/u/${encodeURIComponent(post.authorUsername)}`}
              className="block truncate text-[14px] font-semibold leading-tight text-text transition-opacity duration-200 ease-out hover:opacity-70"
            >
              {post.authorName}
            </Link>
          ) : (
            <p className="truncate text-[14px] font-semibold leading-tight text-text">
              {post.authorName}
            </p>
          )}

          {post.eventId && post.eventTitle && (
            <Link
              href={`/events/${post.eventId}`}
              className="mt-0.5 block truncate text-xs text-muted transition-colors duration-200 ease-out hover:text-text"
            >
              {post.eventTitle}
            </Link>
          )}
        </div>

        <DeletePostMenu
          postId={post.id}
          onDeleteRequested={
            post.isOwner
              ? () => {
                  setConfirming(true);
                  setDeleteError(null);
                }
              : undefined
          }
        />
      </div>

      {confirming && (
        <div className="space-y-3 rounded-lg bg-surface-2 p-3">
          <p className="text-sm text-text">
            Delete this post? It can&apos;t be undone.
          </p>

          {deleteError && (
            <p role="alert" className="text-sm text-text">
              {deleteError}
            </p>
          )}

          <div className="flex flex-wrap gap-2">
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDelete}
              disabled={pending}
            >
              {pending ? "Deleting..." : "Delete"}
            </Button>

            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setConfirming(false);
                setDeleteError(null);
              }}
              disabled={pending}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {hasPhotos ? (
        <div
          className="group relative -mx-4 overflow-hidden bg-surface-2"
          style={{ touchAction: "manipulation" }}
          onClick={handlePhotoClick}
        >
          {images.length === 1 ? (
            <div className="w-full">
              <img
                draggable={false}
                src={images[0]}
                alt={alt}
                loading="lazy"
                decoding="async"
                onError={() => setImageFailed(true)}
                className="aspect-[4/5] w-full select-none object-cover"
                style={{ WebkitUserDrag: "none" } as React.CSSProperties}
              />
            </div>
          ) : (
          <div
            ref={trackRef}
            data-carousel
            data-no-swipe
            tabIndex={0}
            aria-label="Photos"
            onScroll={handleScroll}
            onKeyDown={handleCarouselKey}
            className="flex"
          >
            {images.map((imageUrl, index) => (
              <div
                key={`${imageUrl}-${index}`}
                className="w-full shrink-0 snap-center"
              >
                <img
                  draggable={false}
                  src={imageUrl}
                  alt={alt}
                  loading="lazy"
                  decoding="async"
                  onError={() => setImageFailed(true)}
                  className="aspect-[4/5] w-full select-none object-cover"
                  style={{ WebkitUserDrag: "none" } as React.CSSProperties}
                />
              </div>
            ))}
          </div>
          )}

          {images.length > 1 && (
            <>
              {imageIndex > 0 && (
                <button
                  type="button"
                  onClick={() => goToImage(imageIndex - 1)}
                  aria-label="Previous photo"
                  className="absolute left-2 top-1/2 carousel-arrow"
                >
                  <ChevronLeft size={20} strokeWidth={2} aria-hidden="true" />
                </button>
              )}
              {imageIndex < images.length - 1 && (
                <button
                  type="button"
                  onClick={() => goToImage(imageIndex + 1)}
                  aria-label="Next photo"
                  className="absolute right-2 top-1/2 carousel-arrow"
                >
                  <ChevronRight size={20} strokeWidth={2} aria-hidden="true" />
                </button>
              )}
              <div className="pointer-events-none absolute right-2 top-2 rounded-full bg-scrim/60 px-2 py-1 text-xs font-semibold text-on-primary">
                {imageIndex + 1}/{images.length}
              </div>

              <div className="absolute inset-x-0 bottom-3 flex justify-center gap-1.5">
                {images.map((imageUrl, index) => (
                  <button
                    key={`dot-${imageUrl}-${index}`}
                    type="button"
                    onClick={() => goToImage(index)}
                    aria-label={`Go to photo ${index + 1}`}
                    aria-current={index === imageIndex}
                    className={`h-1.5 w-1.5 rounded-full transition-opacity duration-200 ease-out ${
                      index === imageIndex
                        ? "bg-on-primary"
                        : "bg-on-primary/40"
                    }`}
                  />
                ))}
              </div>
            </>
          )}

          {heart && (
            <span
              key={heart.key}
              aria-hidden="true"
              className="double-tap-heart pointer-events-none absolute inset-0 flex items-center justify-center"
            >
              <Heart
                size={96}
                fill="white"
                strokeWidth={1}
                className="text-on-primary drop-shadow-[0_2px_12px_rgba(0,0,0,0.35)]"
              />
            </span>
          )}
        </div>
      ) : isTextOnly ? (
        <div className="-mx-4 flex min-h-[260px] items-center justify-center bg-surface-2 px-6 py-10">
          <p className="selectable whitespace-pre-wrap break-words text-center text-xl font-semibold leading-snug text-text">
            {post.caption}
          </p>
        </div>
      ) : (
        <p className="py-4 text-sm text-muted">Photo unavailable.</p>
      )}

      <div className="flex items-center gap-1">
        <PostLikeButton
          ref={likeRef}
          postId={post.id}
          initialLiked={post.hasLiked}
          initialCount={post.likeCount ?? 0}
          showCount={false}
          onCountChange={setLikeCount}
        />

        {showComments ? (
          <button
            type="button"
            onClick={() => setCommentsOpen(true)}
            aria-label={`${commentCount} ${
              commentCount === 1 ? "comment" : "comments"
            }`}
            className="inline-flex min-h-11 min-w-11 items-center justify-center text-text transition-opacity duration-200 ease-out hover:opacity-70"
          >
            {commentButton}
          </button>
        ) : (
          <a
            href="#comments"
            aria-label={`${commentCount} ${
              commentCount === 1 ? "comment" : "comments"
            }`}
            className="inline-flex min-h-11 min-w-11 items-center justify-center text-text transition-opacity duration-200 ease-out hover:opacity-70"
          >
            {commentButton}
          </a>
        )}

        <PostCopyLinkButton postId={post.id} />
      </div>

      <p className="px-1 text-[14px] font-semibold text-text">
        {likeCount} {likeCount === 1 ? "like" : "likes"}
      </p>

      {post.caption && !isTextOnly && (
        <div className="relative">
          <p
            className={`text-base leading-snug text-text ${
              expanded ? "whitespace-pre-wrap break-words" : "line-clamp-2"
            }`}
          >
            <Link
              href={
                post.authorUsername
                  ? `/u/${encodeURIComponent(post.authorUsername)}`
                  : `/feed/${post.id}`
              }
              className="font-semibold transition-opacity duration-200 ease-out hover:opacity-70"
            >
              {post.authorName}
            </Link>{" "}
            {post.caption}
          </p>

          {!expanded && captionIsLong && (
            <button
              type="button"
              onClick={() => setExpanded(true)}
              className="absolute bottom-0 right-0 bg-background pl-1 text-sm text-muted transition-opacity duration-200 ease-out hover:opacity-70"
            >
              more
            </button>
          )}
        </div>
      )}

      {showComments && commentCount > 0 && (
        <button
          type="button"
          onClick={() => setCommentsOpen(true)}
          className="block min-h-6 text-sm text-muted transition-opacity duration-200 ease-out hover:opacity-70"
        >
          View all {commentCount} {commentCount === 1 ? "comment" : "comments"}
        </button>
      )}

      {showComments && (post.previewComments ?? []).length > 0 && (
        <ul className="space-y-0.5">
          {(post.previewComments ?? []).map((comment) => (
            <li key={comment.id}>
              <button
                type="button"
                onClick={() => setCommentsOpen(true)}
                className="line-clamp-2 w-full text-left text-base leading-snug text-text"
              >
                <span className="font-semibold">{comment.authorName}</span>{" "}
                <span className="break-words">{comment.body}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <p className="px-1 text-xs text-muted">{post.relativeTime}</p>

      {commentsOpen && (
        <PostCommentsSheet
          postId={post.id}
          postAuthorId={post.authorId}
          initialCount={commentCount}
          onClose={() => setCommentsOpen(false)}
          onCountChange={setCommentCount}
        />
      )}
    </article>
  );
}
