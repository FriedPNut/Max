"use client";

import type { ReactNode } from "react";

/**
 * iOS switch: 51x31 track with a 27px knob.
 *
 * With children the switch is the whole row (label left, control right); the
 * track keeps its 2px inner gap on both ends: 2 + 27 + 20 = 49 inside the
 * 51px track, so the knob never overhangs the track.
 */
export function Switch({
  checked,
  onChange,
  disabled = false,
  label,
  children,
  className = "",
}: {
  checked: boolean;
  onChange: () => void;
  disabled?: boolean;
  label: string;
  children?: ReactNode;
  className?: string;
}) {
  const isRow = Boolean(children);

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={onChange}
      className={`inline-flex min-h-11 shrink-0 items-center transition-colors duration-200 ease-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:pointer-events-none disabled:opacity-40 ${
        isRow
          ? "w-full justify-between gap-4 rounded-lg text-left"
          : "justify-center"
      } ${className}`}
    >
      {isRow && (
        <span className="min-w-0 flex-1 text-base text-text">{children}</span>
      )}

      <span
        aria-hidden="true"
        className={`relative inline-flex h-[31px] w-[51px] shrink-0 items-center rounded-full transition-colors duration-200 ease-spring ${
          checked ? "bg-primary" : "bg-line"
        }`}
      >
        <span
          className="switch-knob shadow-control absolute h-[27px] w-[27px] rounded-full bg-on-primary"
          style={{
            top: 2,
            left: 2,
            transform: checked ? "translateX(20px)" : "translateX(0)",
          }}
        />
      </span>
    </button>
  );
}
