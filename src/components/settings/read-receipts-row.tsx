"use client";

import { useState } from "react";
import { Switch } from "@/components/ui";
import { setReadReceiptsAction } from "@/app/actions/profile";

/**
 * profiles.read_receipts defaults to on. Turning it off stops recording my
 * seen_at and hides everyone else's markers, so the copy states both halves.
 */
export function ReadReceiptsRow({ initial }: { initial: boolean }) {
  const [on, setOn] = useState(initial);
  const [error, setError] = useState<string | null>(null);

  async function toggle() {
    const next = !on;
    setOn(next);
    setError(null);

    const result = await setReadReceiptsAction(next);

    if (result.error) {
      setOn(!next);
      setError(result.error);
    }
  }

  return (
    <div className="px-4">
      <Switch
        checked={on}
        onChange={() => void toggle()}
        label="Read receipts"
      >
        Read receipts
      </Switch>

      <p className="pb-3 text-[12px] leading-relaxed text-muted">
        If you turn this off, you won’t see receipts from others either.
      </p>

      {error ? (
        <p role="alert" className="pb-3 text-[12px] text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
