"use client";

import { Heart, X } from "lucide-react";
import { useEffect, useState } from "react";
import type { ProfilePost } from "@/lib/profile";

export function ProfilePostGrid({ posts }: { posts: ProfilePost[] }) {
  const [selected, setSelected] = useState<ProfilePost | null>(null);

  useEffect(() => {
    if (!selected) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setSelected(null);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selected]);

  if (posts.length === 0) {
    return <p className="text-sm text-muted">No posts yet.</p>;
  }

  return (
    <>
      <div className="grid grid-cols-3 gap-1">
        {posts.map((post) => (
          <button
            key={post.id}
            type="button"
            onClick={() => setSelected(post)}
            aria-label={
              post.caption ? `View photo: ${post.caption}` : "View photo"
            }
            className="aspect-square overflow-hidden rounded-lg bg-surface p-0 cursor-pointer"
          >
            {post.imageUrl ? (
              <img
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
          </button>
        ))}
      </div>

      {selected && (
        <div className="fixed inset-0 z-50 bg-background">
          <div className="mx-auto flex h-full w-full max-w-[560px] flex-col px-4 py-4">
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setSelected(null)}
                aria-label="Close photo"
                className="inline-flex h-11 w-11 items-center justify-center rounded-lg text-text transition-colors duration-150 ease-out hover:bg-surface cursor-pointer"
              >
                <X size={24} strokeWidth={1.5} aria-hidden="true" />
              </button>
            </div>

            <div className="flex min-h-0 flex-1 items-center justify-center py-2">
              {selected.imageUrl ? (
                <img
                  src={selected.imageUrl}
                  alt={selected.caption || "Post photo"}
                  className="max-h-full max-w-full rounded-lg object-contain"
                />
              ) : (
                <p className="text-sm text-muted">Photo unavailable.</p>
              )}
            </div>

            <div className="mt-3 flex items-center gap-2 text-sm text-muted">
              <Heart size={18} strokeWidth={1.5} aria-hidden="true" />
              <span>
                {selected.likeCount}{" "}
                {selected.likeCount === 1 ? "like" : "likes"}
              </span>
            </div>

            {selected.caption && (
              <p className="mt-2 max-h-32 overflow-y-auto whitespace-pre-wrap break-words text-base text-text">
                {selected.caption}
              </p>
            )}
          </div>
        </div>
      )}
    </>
  );
}
