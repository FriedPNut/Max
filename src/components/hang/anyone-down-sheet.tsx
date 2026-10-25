"use client";

import { useState } from "react";
import { createHangAction } from "@/app/actions/hangs";
import { HANG_MESSAGE_MAX, type HangDuration } from "@/lib/hangs";

const DURATIONS: { value: HangDuration; label: string }[] = [
  { value: "1h", label: "1 hour" },
  { value: "3h", label: "3 hours" },
  { value: "midnight", label: "Tonight until midnight" },
];

const fieldClass =
  "w-full bg-surface text-text placeholder:text-muted border border-border rounded-lg px-3 py-3 text-base leading-snug focus:outline-2 focus:outline-offset-0 focus:outline-text";

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
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Anyone down?"
      className="fixed inset-0 z-50 flex items-end justify-center bg-scrim/40"
      onClick={onClose}
    >
      <form
        onSubmit={submit}
        onClick={(event) => event.stopPropagation()}
        className="w-full max-w-[560px] space-y-5 rounded-t-lg border-t border-border bg-background p-4 pb-8"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-text">Anyone down?</h2>
          <button
            type="button"
            onClick={onClose}
            className="min-h-11 px-3 text-sm text-muted hover:text-text cursor-pointer"
          >
            Cancel
          </button>
        </div>

        <div>
          <label htmlFor="hang-message" className="mb-2 block text-sm text-muted">
            What&apos;s the plan?
          </label>
          <textarea
            id="hang-message"
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            maxLength={HANG_MESSAGE_MAX}
            rows={3}
            required
            placeholder="Coffee at Bean Lab?"
            className={`${fieldClass} resize-none`}
          />
          <p className="mt-1 text-right text-sm text-muted">
            {message.length}/{HANG_MESSAGE_MAX}
          </p>
        </div>

        <div>
          <label htmlFor="hang-location" className="mb-2 block text-sm text-muted">
            Location (optional)
          </label>
          <input
            id="hang-location"
            type="text"
            value={location}
            onChange={(event) => setLocation(event.target.value)}
            maxLength={120}
            placeholder="Bean Lab, 3rd St"
            className={fieldClass}
          />
        </div>

        <div>
          <p className="mb-2 text-sm text-muted">Open for</p>
          <div className="flex flex-wrap gap-2">
            {DURATIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                aria-pressed={duration === option.value}
                onClick={() => setDuration(option.value)}
                className={`min-h-11 rounded-lg border px-4 text-sm transition-colors duration-150 ease-out cursor-pointer ${
                  duration === option.value
                    ? "border-text bg-text text-background"
                    : "border-border bg-transparent text-text hover:bg-surface"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <p role="alert" className="text-sm text-text">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={pending || message.trim().length === 0}
          className="min-h-11 w-full rounded-lg bg-text px-4 py-3 text-sm font-medium text-background transition-opacity duration-150 ease-out hover:opacity-90 cursor-pointer disabled:opacity-60 disabled:pointer-events-none"
        >
          {pending ? "Posting..." : "Post"}
        </button>
      </form>
    </div>
  );
}
