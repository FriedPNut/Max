"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui";
import {
  BUBBLE_COLORS,
  DEFAULT_BUBBLE_COLOR,
  bubbleTextColor,
  normalizeHex,
} from "@/lib/bubble-colors";

/**
 * The chat color control from settings: eight swatches, a custom color, a live
 * preview bubble and Reset. It is presentational — the caller applies and saves
 * the color — so it can be reused anywhere.
 */
export function ChatColorPicker({
  value,
  onChange,
  onReset,
  disabled = false,
}: {
  value: string;
  onChange: (hex: string) => void;
  onReset: () => void;
  disabled?: boolean;
}) {
  const current = normalizeHex(value) ?? DEFAULT_BUBBLE_COLOR;
  const [draft, setDraft] = useState(current);
  const [invalid, setInvalid] = useState(false);
  // While the hex field has focus the draft belongs to the typist.
  const [typing, setTyping] = useState(false);

  useEffect(() => {
    if (typing) {
      return;
    }

    setDraft(current);
    setInvalid(false);
  }, [current, typing]);

  function commit(next: string) {
    const normalized = normalizeHex(next);

    if (!normalized) {
      setInvalid(true);
      return;
    }

    setInvalid(false);
    onChange(normalized);
  }

  const previewText = bubbleTextColor(current);

  return (
    <div className="space-y-5">
      <div
        role="group"
        aria-label="Chat color"
        className="grid grid-cols-4 gap-2"
      >
        {BUBBLE_COLORS.map((color) => {
          const selected = current === color.hex;

          return (
            <button
              key={color.hex}
              type="button"
              onClick={() => commit(color.hex)}
              disabled={disabled}
              aria-label={color.name}
              aria-pressed={selected}
              className={`flex h-11 items-center justify-center rounded-lg transition-transform duration-100 ease-out active:scale-95 disabled:opacity-40 ${
                selected ? "ring-2 ring-text ring-offset-2 ring-offset-surface" : ""
              }`}
              style={{ backgroundColor: color.hex }}
            >
              {selected ? (
                <span
                  aria-hidden="true"
                  className="text-sm font-semibold"
                  style={{ color: bubbleTextColor(color.hex) }}
                >
                  ✓
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      <div className="space-y-2">
        <label htmlFor="chat-color-custom" className="block text-[13px] text-muted">
          Custom color
        </label>
        <div className="flex items-center gap-2">
          <input
            id="chat-color-custom"
            type="color"
            value={current.toLowerCase()}
            disabled={disabled}
            onChange={(event) => commit(event.target.value)}
            aria-label="Pick a custom color"
            className="h-11 w-12 shrink-0 cursor-pointer rounded-lg border border-border bg-surface-2 p-1"
          />
          <input
            type="text"
            value={draft}
            disabled={disabled}
            onChange={(event) => {
              const next = event.target.value;
              setDraft(next);
              const normalized = normalizeHex(next);

              if (normalized) {
                setInvalid(false);
                onChange(normalized);
              } else {
                setInvalid(true);
              }
            }}
            onFocus={() => setTyping(true)}
            onBlur={() => {
              setTyping(false);
              commit(draft);
            }}
            aria-label="Hex color"
            aria-invalid={invalid}
            autoComplete="off"
            spellCheck={false}
            maxLength={7}
            className="min-w-0 flex-1 rounded-lg border border-border bg-surface-2 px-3.5 py-2.5 text-base text-text outline-none focus:border-primary"
          />
        </div>
        {invalid ? (
          <p role="alert" className="text-[13px] text-muted">
            Use a six-digit hex color, like #8B3BEB.
          </p>
        ) : null}
      </div>

      <div className="space-y-1.5">
        <p className="text-[13px] text-muted">Preview</p>
        <div className="flex justify-end">
          <span
            aria-hidden="true"
            className="max-w-[78%] rounded-[22px] px-3.5 py-2 text-base leading-[1.4] transition-colors duration-200 ease-out"
            style={{ backgroundColor: current, color: previewText }}
          >
            This is how my messages look.
          </span>
        </div>
        <div className="flex justify-start">
          <span
            aria-hidden="true"
            className="max-w-[78%] rounded-[22px] bg-surface-2 px-3.5 py-2 text-base leading-[1.4] text-text"
          >
            And theirs stay neutral.
          </span>
        </div>
      </div>

      <Button
        type="button"
        variant="secondary"
        onClick={onReset}
        disabled={disabled || current === DEFAULT_BUBBLE_COLOR}
        className="w-full"
      >
        Reset
      </Button>
    </div>
  );
}
