"use client";

import { useState } from "react";
import { respondToHangAction } from "@/app/actions/hangs";
import type { HangResponse } from "@/lib/hangs";

export type PendingHang = {
  id: string;
  creatorName: string;
  message: string;
};

const RESPONSES: { value: HangResponse; label: string }[] = [
  { value: "in", label: "I'm in" },
  { value: "later", label: "Maybe later" },
  { value: "out", label: "Can't" },
];

export function HangBanner({ hang }: { hang: PendingHang | null }) {
  const [answered, setAnswered] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!hang || answered) {
    return null;
  }

  async function respond(response: HangResponse) {
    if (!hang) {
      return;
    }

    setError(null);
    const result = await respondToHangAction({ hangId: hang.id, response });

    if (result.error) {
      setError(result.error);
      return;
    }

    setAnswered(true);
  }

  return (
    <section
      aria-label="Anyone down?"
      className="space-y-3 rounded-lg border border-border bg-surface p-4"
    >
      <p className="text-base text-text break-words">
        <span className="text-muted">{hang.creatorName}: </span>
        {hang.message}
      </p>

      <div className="flex flex-wrap gap-2">
        {RESPONSES.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => void respond(option.value)}
            className="min-h-11 rounded-lg border border-border bg-transparent px-4 text-sm text-text transition-colors duration-150 ease-out hover:bg-background cursor-pointer"
          >
            {option.label}
          </button>
        ))}
      </div>

      {error && (
        <p role="alert" className="text-sm text-text">
          {error}
        </p>
      )}
    </section>
  );
}
