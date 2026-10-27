"use client";

import { useEffect } from "react";
import { readCache, writeCache } from "@/lib/cache";
import type { IdeaListItem } from "@/lib/events";
import type { IdeaCard } from "@/lib/ideas";

/**
 * One idea change, announced to every surface on this device. The Ideas widget,
 * the Ideas page and the cards inside chats all listen here, and the cached
 * "ideas" list (the same cache key the Ideas widget stores) is patched in
 * place, so a vote or a conversion never leaves two screens disagreeing.
 */

export const IDEA_SYNC_EVENT = "max:idea";

export type IdeaPatch = Partial<IdeaCard> & { id: string };

export type IdeaSyncDetail =
  | { kind: "update"; userId: string; idea: IdeaPatch }
  | { kind: "remove"; userId: string; ideaId: string };

const CACHE_NAME = "ideas";

/** Only the fields a list row understands; unknown keys stay out of the cache. */
function cachedFields(patch: IdeaPatch): Partial<IdeaListItem> {
  const next: Partial<IdeaListItem> = {};

  if (patch.title !== undefined) next.title = patch.title;
  if (patch.description !== undefined) next.description = patch.description;
  if (patch.status !== undefined) next.status = patch.status;
  if (patch.eventId !== undefined) next.eventId = patch.eventId;
  if (patch.voteCount !== undefined) next.voteCount = patch.voteCount;
  if (patch.hasVoted !== undefined) next.hasVoted = patch.hasVoted;
  if (patch.isCreator !== undefined) next.isCreator = patch.isCreator;

  return next;
}

function patchCachedIdeas(userId: string, idea: IdeaPatch) {
  const cached = readCache<IdeaListItem[]>(userId, CACHE_NAME);

  if (!cached || cached.length === 0) {
    return;
  }

  let changed = false;
  const next = cached.map((item) => {
    if (item.id !== idea.id) {
      return item;
    }

    changed = true;
    return { ...item, ...cachedFields(idea) };
  });

  if (changed) {
    writeCache(userId, CACHE_NAME, next);
  }
}

function removeCachedIdea(userId: string, ideaId: string) {
  const cached = readCache<IdeaListItem[]>(userId, CACHE_NAME);

  if (!cached || cached.length === 0) {
    return;
  }

  const next = cached.filter((item) => item.id !== ideaId);

  if (next.length !== cached.length) {
    writeCache(userId, CACHE_NAME, next);
  }
}

function announce(detail: IdeaSyncDetail) {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(
    new CustomEvent<IdeaSyncDetail>(IDEA_SYNC_EVENT, { detail })
  );
}

/** Called after a vote, an edit, a conversion or a delete. */
export function publishIdeaUpdate(userId: string, idea: IdeaPatch) {
  patchCachedIdeas(userId, idea);
  announce({ kind: "update", userId, idea });
}

export function publishIdeaRemoval(userId: string, ideaId: string) {
  removeCachedIdea(userId, ideaId);
  announce({ kind: "remove", userId, ideaId });
}

/** The cache is per account, so another account's events are ignored. */
export function useIdeaSync(
  userId: string,
  onChange: (detail: IdeaSyncDetail) => void
) {
  useEffect(() => {
    function onEvent(event: Event) {
      const detail = (event as CustomEvent<IdeaSyncDetail>).detail;

      if (!detail || detail.userId !== userId) {
        return;
      }

      onChange(detail);
    }

    window.addEventListener(IDEA_SYNC_EVENT, onEvent);
    return () => window.removeEventListener(IDEA_SYNC_EVENT, onEvent);
  }, [onChange, userId]);
}
