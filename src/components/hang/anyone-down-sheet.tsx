"use client";

import { useState } from "react";
import { createHangAction } from "@/app/actions/hangs";
import { Button, Chip, Input, Sheet, Textarea } from "@/components/ui";
import { HANG_MESSAGE_MAX, type HangDuration } from "@/lib/hangs";

const DURATIONS: { value: HangDuration; label: string }[] = [
  { value: "1h", label: "1 hour" },
  { value: "3h", label: "3 hours" },
  { value: "midnight", label: "Tonight until midnight" },
];

export function AnyoneDownSheet({ onClose }: { onClose: () => void }) {
  const [message, setMessage] = useState("");
  const [location, setLocation] = useState("");
  const [duration, setDuration] = useState<HangDuration>("3h");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (pending) {
      return;
    }

    setPending(true);
    setError(null);
    const result = await createHangAction({ message, location, duration });
    setPending(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    onClose();
  }

  return (
    <Sheet label="Anyone down?" onClose={onClose}>
      <form onSubmit={submit} className="space-y-5 pb-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-text">Anyone down?</h2>
          <Button variant="text" size="sm" onClick={onClose}>
            Cancel
          </Button>
        </div>

        <div>
          <label
            htmlFor="hang-message"
            className="mb-2 block text-sm text-muted"
          >
            What&apos;s the plan?
          </label>
          <Textarea
            id="hang-message"
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            maxLength={HANG_MESSAGE_MAX}
            rows={3}
            required
            placeholder="Coffee at Bean Lab?"
            className="resize-none"
          />
          <p className="mt-1 text-right text-xs text-muted">
            {message.length}/{HANG_MESSAGE_MAX}
          </p>
        </div>

        <div>
          <label
            htmlFor="hang-location"
            className="mb-2 block text-sm text-muted"
          >
            Location (optional)
          </label>
          <Input
            id="hang-location"
            type="text"
            value={location}
            onChange={(event) => setLocation(event.target.value)}
            maxLength={120}
            placeholder="Bean Lab, 3rd St"
          />
        </div>

        <div>
          <p className="mb-2 text-sm text-muted">Open for</p>
          <div className="flex flex-wrap gap-2">
            {DURATIONS.map((option) => (
              <Chip
                key={option.value}
                selected={duration === option.value}
                onClick={() => setDuration(option.value)}
              >
                {option.label}
              </Chip>
            ))}
          </div>
        </div>

        {error && (
          <p role="alert" className="text-sm text-text">
            {error}
          </p>
        )}

        <Button
          type="submit"
          loading={pending}
          disabled={pending || message.trim().length === 0}
          className="w-full"
        >
          Post
        </Button>
      </form>
    </Sheet>
  );
}
