"use client";

import { useEffect, useRef, useState } from "react";
import { Chip } from "@/components/ui/chip";
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
      className="inline-flex items-center gap-0.5 rounded-full bg-surface px-1 py-1 shadow-pop"
    >
      {REACTION_KEYS.map((reaction) => (
        <button
          key={reaction}
          type="button"
          onClick={() => onPick(reaction)}
          aria-label={REACTION_LABELS[reaction]}
          className="flex h-10 w-10 items-center justify-center rounded-full text-lg leading-none transition-colors duration-200 ease-out hover:bg-surface-2 active:opacity-90"
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
  const wasMine = useRef(mine);
  const [popping, setPopping] = useState(false);

  useEffect(() => {
    const previous = wasMine.current;
    wasMine.current = mine;

    if (!mine || previous) {
      return;
    }

    setPopping(true);
    const timer = window.setTimeout(() => setPopping(false), 320);
    return () => window.clearTimeout(timer);
  }, [mine]);

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
    <Chip
      data-reaction-ui="chip"
      selected={mine}
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
      className={`min-h-7 gap-1 px-2 py-0.5 text-xs ${popping ? "reaction-pop" : ""}`}
    >
      <span aria-hidden="true" className="leading-none">
        {REACTION_EMOJI[reaction]}
      </span>
      <span className="opacity-80">{count}</span>
    </Chip>
  );
}
