"use client";

import { useState } from "react";
import { respondToHangAction } from "@/app/actions/hangs";
import { Card, Chip } from "@/components/ui";
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
    <Card aria-label="Anyone down?" className="space-y-3 p-4">
      <p className="break-words text-base text-text">
        <span className="text-muted">{hang.creatorName}: </span>
        {hang.message}
      </p>

      <div className="flex flex-wrap gap-2">
        {RESPONSES.map((option) => (
          <Chip
            key={option.value}
            onClick={() => void respond(option.value)}
            className="min-h-11 px-4"
          >
            {option.label}
          </Chip>
        ))}
      </div>

      {error && (
        <p role="alert" className="text-sm text-text">
          {error}
        </p>
      )}
    </Card>
  );
}
