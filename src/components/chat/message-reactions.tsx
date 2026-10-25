"use client";

import { useRef } from "react";
import {
  REACTION_EMOJI,
  REACTION_KEYS,
  REACTION_LABELS,
  type ReactionKey,
} from "@/lib/chat";

export function ReactionBar({ onPick }: { onPick: (reaction: ReactionKey) => void }) {
  return (
    <div
      data-reaction-ui="bar"
      role="group"
      aria-label="Pick a reaction"
      className="inline-flex items-center gap-0.5 rounded-lg border border-border bg-surface px-1 py-1"
    >
      {REACTION_KEYS.map((reaction) => (
        <button
          key={reaction}
          type="button"
          onClick={() => onPick(reaction)}
          aria-label={REACTION_LABELS[reaction]}
          className="flex h-10 w-10 items-center justify-center rounded-lg text-lg leading-none transition-colors duration-150 ease-out hover:bg-background cursor-pointer"
        >
          <span aria-hidden="true">{REACTION_EMOJI[reaction]}</span>
        </button>
      ))}
    </div>
  );
}

export function ReactionChip({
  reaction,
  count,
  mine,
  onToggle,
  onShowWho,
}: {
  reaction: ReactionKey;
  count: number;
  mine: boolean;
  onToggle: () => void;
  onShowWho: () => void;
}) {
  const holdTimer = useRef<number | null>(null);
  const held = useRef(false);

  function clearHold() {
    if (holdTimer.current !== null) {
      window.clearTimeout(holdTimer.current);
      holdTimer.current = null;
    }
  }

  function startHold() {
    held.current = false;
    clearHold();
    holdTimer.current = window.setTimeout(() => {
      holdTimer.current = null;
      held.current = true;
      onShowWho();
    }, 450);
  }

  return (
    <button
      type="button"
      data-reaction-ui="chip"
      aria-pressed={mine}
      aria-label={`${REACTION_LABELS[reaction]}, ${count}. ${
        mine ? "Remove your reaction" : "Add your reaction"
      }`}
      onPointerDown={startHold}
      onPointerUp={clearHold}
      onPointerLeave={clearHold}
      onPointerCancel={clearHold}
      onContextMenu={(event) => event.preventDefault()}
      onClick={(event) => {
        if (held.current) {
          held.current = false;
          event.preventDefault();
          return;
        }

        onToggle();
      }}
      className={`inline-flex min-h-9 items-center gap-1 rounded-full border px-2 text-sm text-text transition-colors duration-150 ease-out hover:bg-surface cursor-pointer ${
        mine ? "border-accent bg-surface" : "border-border bg-background"
      }`}
    >
      <span aria-hidden="true" className="leading-none">
        {REACTION_EMOJI[reaction]}
      </span>
      <span className="text-muted">{count}</span>
    </button>
  );
}
