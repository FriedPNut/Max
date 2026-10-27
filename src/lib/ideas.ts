import type { IdeaListItem, IdeaStatus } from "@/lib/events";

/**
 * Ideas across the widget, the ideas page and a shared card in chat. Pure
 * helpers so the shared rules (what is open, what a preview says, how a patch
 * merges) stay testable.
 */

export type IdeaCard = {
  id: string;
  title: string;
  description: string | null;
  status: IdeaStatus;
  eventId: string | null;
  voteCount: number;
  hasVoted: boolean;
  isCreator: boolean;
};

export const IDEA_DESCRIPTION_MAX_LINES = 2;
export const IDEA_SHARE_NOTE_LIMIT = 2000;
export const IDEA_SHARE_MAX_CHATS = 20;

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function ideaCardFromItem(idea: IdeaListItem): IdeaCard {
  return {
    id: idea.id,
    title: idea.title,
    description: idea.description,
    status: idea.status,
    eventId: idea.eventId,
    voteCount: idea.voteCount,
    hasVoted: idea.hasVoted,
    isCreator: idea.isCreator,
  };
}

export function isIdeaOpen(status: string | null | undefined) {
  return status === "open";
}

/** Only an idea that is still open can become an event. */
export function canMakeEvent(status: string | null | undefined) {
  return isIdeaOpen(status);
}

export function ideaEventHref(eventId: string | null | undefined) {
  return eventId ? `/events/${eventId}` : null;
}

/** The row that opens the form, after the status re-check. */
export function makeEventHref(ideaId: string) {
  return `/events/new?idea=${encodeURIComponent(ideaId)}`;
}

export function ideaVoteToggle(count: number, voted: boolean) {
  const voteCount = Math.max(0, count + (voted ? -1 : 1));

  return { voteCount, hasVoted: !voted };
}

/** Applies a fresher copy without dropping fields the patch leaves out. */
export function mergeIdeaCard(
  current: IdeaCard | null | undefined,
  patch: Partial<IdeaCard> & { id: string }
): IdeaCard {
  return {
    id: patch.id,
    title: patch.title ?? current?.title ?? "Idea",
    description:
      patch.description === undefined
        ? current?.description ?? null
        : patch.description,
    status: patch.status ?? current?.status ?? "open",
    eventId:
      patch.eventId === undefined ? current?.eventId ?? null : patch.eventId,
    voteCount: patch.voteCount ?? current?.voteCount ?? 0,
    hasVoted: patch.hasVoted ?? current?.hasVoted ?? false,
    isCreator: patch.isCreator ?? current?.isCreator ?? false,
  };
}

/** Keeps one card map in step with the patches the app publishes. */
export function applyIdeaPatch(
  cards: Record<string, IdeaCard | null>,
  patch: Partial<IdeaCard> & { id: string }
) {
  const current = cards[patch.id];

  // A card that was already known to be gone stays gone.
  if (current === null && patch.title === undefined) {
    return cards;
  }

  return { ...cards, [patch.id]: mergeIdeaCard(current, patch) };
}

/** A deleted idea leaves a placeholder card behind in chat. */
export function applyIdeaRemoval(
  cards: Record<string, IdeaCard | null>,
  ideaId: string
) {
  if (cards[ideaId] === null) {
    return cards;
  }

  return { ...cards, [ideaId]: null };
}

export function ideaIdsFromMessages(
  messages: { idea_id?: string | null }[]
): string[] {
  const ids = new Set<string>();

  for (const message of messages) {
    const id = message.idea_id;

    if (typeof id === "string" && UUID_PATTERN.test(id)) {
      ids.add(id);
    }
  }

  return [...ids];
}

export function uniqueIdeaIds(values: readonly unknown[]): string[] {
  const ids = new Set<string>();

  for (const value of values) {
    const id = typeof value === "string" ? value.trim() : "";

    if (UUID_PATTERN.test(id)) {
      ids.add(id);
    }
  }

  return [...ids];
}

/** Trimmed note, or null so the message stores no empty body. */
export function shareNote(note: string | null | undefined) {
  const clean = String(note ?? "").trim().slice(0, IDEA_SHARE_NOTE_LIMIT);

  return clean || null;
}

/**
 * Chat list and search preview. A shared idea is never blank, even when it was
 * sent without a note.
 */
export function messagePreview(input: {
  body: string | null;
  idea_id?: string | null;
  image_path: string | null;
}) {
  if (input.body) {
    return input.body;
  }

  if (input.idea_id) {
    return "Shared an idea";
  }

  if (input.image_path) {
    return "Sent a photo";
  }

  return null;
}

export function shareToast(count: number) {
  if (count <= 0) {
    return "Nothing was sent. Try again.";
  }

  return count === 1 ? "Sent to 1 chat" : `Sent to ${count} chats`;
}
