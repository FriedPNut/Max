"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { checkIdeaStatusAction } from "@/app/actions/ideas";
import { IdeaVoteButton } from "@/components/events/idea-vote-button";
import { buttonStyles } from "@/components/ui";
import { publishIdeaUpdate } from "@/lib/idea-sync";
import {
  IDEA_DESCRIPTION_MAX_LINES,
  ideaEventHref,
  makeEventHref,
  type IdeaCard,
} from "@/lib/ideas";

/**
 * A shared idea inside a chat. It is a card, never a bubble: surface fill,
 * 14px radius, the title, two lines of description, the votes and the one
 * action that matters — turning it into an event.
 */
export function IdeaCardInChat({
  ideaId,
  card,
  userId,
  onRemoved,
}: {
  ideaId: string;
  /** undefined while the card loads, null once the idea is gone. */
  card: IdeaCard | null | undefined;
  userId: string;
  onRemoved?: () => void;
}) {
  const router = useRouter();
  const [checking, setChecking] = useState(false);
  const [notice, setNotice] = useState<{
    text: string;
    eventId: string | null;
  } | null>(null);

  function update(next: Partial<IdeaCard> & { id: string }) {
    publishIdeaUpdate(userId, next);
  }

  async function makeEvent() {
    if (checking || !card) {
      return;
    }

    setChecking(true);
    setNotice(null);

    try {
      // Re-check right before the form opens: someone may have just done it.
      const result = await checkIdeaStatusAction(ideaId);

      if (result.removed) {
        setChecking(false);
        onRemoved?.();
        return;
      }

      if (result.error) {
        setNotice({ text: result.error, eventId: null });
        setChecking(false);
        return;
      }

      if (result.status === "open") {
        router.push(makeEventHref(ideaId));
        return;
      }

      // The card itself becomes "Already an event · View" from this update, so
      // no second notice is needed.
      update({
        id: ideaId,
        status: result.status,
        eventId: result.eventId ?? null,
      });
    } catch {
      setNotice({ text: "Couldn't check that idea. Try again.", eventId: null });
    } finally {
      setChecking(false);
    }
  }

  if (card === null) {
    return (
      <div className="w-full rounded-card border border-line bg-surface px-3.5 py-3 text-[13px] text-muted">
        This idea was removed.
      </div>
    );
  }

  if (card === undefined) {
    return (
      <div className="w-full rounded-card border border-line bg-surface p-3.5">
        <span className="skeleton block h-4 w-32 rounded" />
        <span className="skeleton mt-2 block h-3 w-full rounded" />
        <span className="skeleton mt-1.5 block h-3 w-2/3 rounded" />
      </div>
    );
  }

  const open = card.status === "open";
  const eventHref = ideaEventHref(card.eventId);
  const eventLink = notice?.eventId ?? card.eventId;

  return (
    <div className="w-full rounded-card border border-line bg-surface p-3.5">
      <span className="block text-[12px] text-muted">Shared idea</span>

      <Link
        href="/events/ideas"
        className="mt-1 block break-words text-[15px] font-semibold text-text transition-opacity duration-200 ease-out hover:opacity-70"
      >
        {card.title}
      </Link>

      {card.description && (
        <p
          className="mt-1 break-words text-[13px] leading-relaxed text-muted"
          style={{
            display: "-webkit-box",
            WebkitLineClamp: IDEA_DESCRIPTION_MAX_LINES,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {card.description}
        </p>
      )}

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <IdeaVoteButton
          ideaId={card.id}
          title={card.title}
          count={card.voteCount}
          hasVoted={card.hasVoted}
          disabled={!open}
          onChange={(next) =>
            update({ id: card.id, voteCount: next.voteCount, hasVoted: next.hasVoted })
          }
        />

        {open ? (
          <button
            type="button"
            onClick={() => void makeEvent()}
            disabled={checking}
            className={buttonStyles({ variant: "secondary", size: "sm" })}
          >
            {checking ? "Checking..." : "Make it an event"}
          </button>
        ) : card.status === "scheduled" ? (
          eventHref ? (
            <Link
              href={eventHref}
              className="inline-flex min-h-11 items-center text-[13px] font-semibold text-link transition-opacity duration-200 ease-out hover:opacity-70"
            >
              Already an event · View
            </Link>
          ) : (
            <span className="text-[13px] text-muted">Already an event</span>
          )
        ) : null}
      </div>

      {notice && (
        <p className="mt-2 text-[13px] text-text">
          {notice.text}
          {eventLink ? (
            <>
              {" · "}
              <Link
                href={`/events/${eventLink}`}
                className="font-semibold text-link underline underline-offset-4"
              >
                Open their event
              </Link>
            </>
          ) : null}
        </p>
      )}
    </div>
  );
}
