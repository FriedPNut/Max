"use client";

import { Heart, Layers, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Avatar } from "@/components/ui";
import { lockPageScroll } from "@/lib/scroll-lock";
import type { ProfilePost } from "@/lib/profile";
import { useIslandHidden } from "@/lib/use-island-hidden";

export function ProfilePostGrid({
  posts,
  authorName,
  authorUsername,
  authorAvatarUrl,
  emptyState,
}: {
  posts: ProfilePost[];
  authorName?: string;
  authorUsername?: string | null;
  authorAvatarUrl?: string | null;
  /** Rendered when there are no posts (own profile shows the create prompt). */
  emptyState?: React.ReactNode;
}) {
  const [selected, setSelected] = useState<ProfilePost | null>(null);
  useIslandHidden(selected !== null);

  useEffect(() => {
    if (!selected) {
      return;
    }

    const unlock = lockPageScroll();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setSelected(null);
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      unlock();
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [selected]);

  if (posts.length === 0) {
    return (
      emptyState ?? (
        <p className="py-8 text-center text-sm text-muted">No posts yet.</p>
      )
    );
  }

  return (
    <>
      <div className="grid grid-cols-3 gap-px">
        {posts.map((post) => (
          <button
            key={post.id}
            type="button"
            onClick={() => setSelected(post)}
            aria-label={
              post.caption ? `View photo: ${post.caption}` : "View photo"
            }
            className="relative aspect-[4/5] overflow-hidden bg-surface-2 p-0"
          >
            {post.imageUrl ? (
              <img
                draggable={false}
                src={post.imageUrl}
                alt=""
                loading="lazy"
                decoding="async"
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="flex h-full w-full items-center justify-center text-sm text-muted">
                Photo unavailable.
              </span>
            )}

            {(post.imageCount ?? 1) > 1 && (
              <span className="pointer-events-none absolute right-1.5 top-1.5 text-on-primary drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]">
                <Layers size={16} strokeWidth={2} aria-hidden="true" />
              </span>
            )}
          </button>
        ))}
      </div>

      {selected && (
        <div
          className="fixed inset-0 z-50 flex flex-col bg-scrim text-on-primary"
          data-no-swipe
        >
          <div className="mx-auto flex w-full max-w-[560px] items-center gap-3 px-4 pb-3 pt-[calc(env(safe-area-inset-top,0px)+12px)]">
            <Avatar
              src={authorAvatarUrl}
              initial={authorName?.charAt(0)}
              size={32}
            />

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">
                {authorName || "Post"}
              </p>
              {authorUsername && (
                <p className="truncate text-xs text-on-primary/70">
                  @{authorUsername}
                </p>
              )}
            </div>

            <button
              type="button"
              onClick={() => setSelected(null)}
              aria-label="Close photo"
              className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-on-primary transition-colors duration-200 ease-out hover:bg-on-primary/10"
            >
              <X size={24} strokeWidth={1.75} aria-hidden="true" />
            </button>
          </div>

          <div className="flex min-h-0 flex-1 items-center justify-center">
            {selected.imageUrl ? (
              <img
                draggable={false}
                src={selected.imageUrl}
                alt={selected.caption || "Post photo"}
                className="max-h-full max-w-full object-contain"
              />
            ) : (
              <p className="text-sm text-on-primary/70">Photo unavailable.</p>
            )}
          </div>

          <div className="mx-auto w-full max-w-[560px] px-4 pb-[calc(env(safe-area-inset-bottom,0px)+20px)] pt-3">
            <div className="flex items-center gap-2">
              <Heart size={24} strokeWidth={1.75} aria-hidden="true" />
              <span className="text-sm font-semibold">
                {selected.likeCount}{" "}
                {selected.likeCount === 1 ? "like" : "likes"}
              </span>
            </div>

            {selected.caption && (
              <p className="mt-2 max-h-32 overflow-y-auto whitespace-pre-wrap break-words text-base">
                {selected.caption}
              </p>
            )}
          </div>
        </div>
      )}
    </>
  );
}
