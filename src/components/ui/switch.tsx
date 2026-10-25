"use client";

import type { ReactNode } from "react";

/**
 * The one switch in the app.
 *
 * Track is 44x26 with a 1px border (border-box), so the padding box is 42px
 * wide. The knob is 20px at left: 2px, translated 18px when on:
 * 2 + 20 + 18 = 40, leaving an equal 2px gap inside the padding box (3px from
 * the outer edge) on both ends. The button around it is 44px tall so the tap
 * target clears 44px without growing the track.
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
  // With children the switch is the whole row: label on the left, switch on
  // the right, and the entire row is the button. Without children it is just
  // the control, with the label provided by aria-label.
  const isRow = Boolean(children);

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={onChange}
      className={`inline-flex min-h-11 shrink-0 items-center transition-colors duration-150 ease-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-text disabled:cursor-not-allowed disabled:opacity-40 ${
        isRow
          ? "w-full justify-between gap-4 rounded-lg text-left"
          : "justify-center"
      } ${disabled ? "cursor-not-allowed" : "cursor-pointer"} ${className}`}
    >
      {isRow && (
        <span className="min-w-0 flex-1 text-sm text-muted">{children}</span>
      )}

      <span
        aria-hidden="true"
        className={`relative inline-flex h-[26px] w-[44px] shrink-0 items-center rounded-full border transition-colors duration-150 ease-out ${
          checked ? "border-text bg-text" : "border-line bg-line"
        }`}
        style={{ boxSizing: "border-box" }}
      >
        <span
          className={`absolute h-5 w-5 rounded-full transition-transform duration-150 ease-out ${
            checked ? "bg-background" : "bg-muted"
          }`}
          style={{
            top: "50%",
            left: 2,
            transform: checked ? "translate(18px, -50%)" : "translateY(-50%)",
          }}
        />
      </span>
    </button>
  );
}
