/**
 * Chat bubble colors (DESIGN.md §9, reworked): my own bubbles are one solid
 * color picked in settings, others stay surface-2. Everything here is pure so
 * it can run in the browser, in the startup script and in tests.
 */

export const BUBBLE_COLORS = [
  { name: "Purple", hex: "#8B3BEB" },
  { name: "Blue", hex: "#3797F0" },
  { name: "Teal", hex: "#0EA5A5" },
  { name: "Green", hex: "#1FA95B" },
  { name: "Orange", hex: "#FF7A1A" },
  { name: "Red", hex: "#FF3040" },
  { name: "Pink", hex: "#E91E8C" },
  { name: "Graphite", hex: "#6B7280" },
] as const;

/** The color used until someone picks their own. */
export const DEFAULT_BUBBLE_COLOR = "#8B3BEB";

/** localStorage key, written before paint by the startup script. */
export const BUBBLE_COLOR_STORAGE_KEY = "max:bubble-color";

export const BUBBLE_BACKGROUND_VAR = "--bubble-mine";
export const BUBBLE_TEXT_VAR = "--bubble-mine-text";

/** `#abc123` or `abc123` → `#ABC123`, anything else → null. */
export function normalizeHex(value: unknown): string | null {
  const raw = String(value ?? "").trim();
  const withHash = raw.startsWith("#") ? raw : `#${raw}`;

  return /^#[0-9a-fA-F]{6}$/.test(withHash) ? withHash.toUpperCase() : null;
}

function channel(value: number) {
  const ratio = value / 255;

  return ratio <= 0.03928
    ? ratio / 12.92
    : Math.pow((ratio + 0.055) / 1.055, 2.4);
}

/** WCAG relative luminance of a six-digit hex color (0 is black, 1 is white). */
export function relativeLuminance(hex: string): number {
  const normalized = normalizeHex(hex) ?? DEFAULT_BUBBLE_COLOR;
  const red = parseInt(normalized.slice(1, 3), 16);
  const green = parseInt(normalized.slice(3, 5), 16);
  const blue = parseInt(normalized.slice(5, 7), 16);

  return (
    0.2126 * channel(red) + 0.7152 * channel(green) + 0.0722 * channel(blue)
  );
}

/** Contrast ratio between two hex colors, from 1 to 21. */
export function contrastRatio(a: string, b: string): number {
  const first = relativeLuminance(a);
  const second = relativeLuminance(b);
  const lighter = Math.max(first, second);
  const darker = Math.min(first, second);

  return (lighter + 0.05) / (darker + 0.05);
}

/** White or black, whichever reads better on the given bubble color. */
export function bubbleTextColor(hex: string): "#FFFFFF" | "#111111" {
  const normalized = normalizeHex(hex) ?? DEFAULT_BUBBLE_COLOR;

  return contrastRatio(normalized, "#FFFFFF") >= contrastRatio(normalized, "#000000")
    ? "#FFFFFF"
    : "#111111";
}

/** Writes the color and its text color onto the document, and remembers it. */
export function applyBubbleColor(hex: string, persist = true) {
  if (typeof document === "undefined") {
    return;
  }

  const normalized = normalizeHex(hex) ?? DEFAULT_BUBBLE_COLOR;
  const root = document.documentElement;

  root.style.setProperty(BUBBLE_BACKGROUND_VAR, normalized);
  root.style.setProperty(BUBBLE_TEXT_VAR, bubbleTextColor(normalized));

  if (!persist) {
    return;
  }

  try {
    localStorage.setItem(BUBBLE_COLOR_STORAGE_KEY, normalized);
  } catch {
    // Private mode: the CSS variable still applies for this session.
  }
}

export function readStoredBubbleColor(): string {
  if (typeof localStorage === "undefined") {
    return DEFAULT_BUBBLE_COLOR;
  }

  try {
    return normalizeHex(localStorage.getItem(BUBBLE_COLOR_STORAGE_KEY)) ?? DEFAULT_BUBBLE_COLOR;
  } catch {
    return DEFAULT_BUBBLE_COLOR;
  }
}

/**
 * Runs in <head> before the first paint, so my bubbles are already the right
 * color and the app never re-renders to change them.
 */
export const BUBBLE_COLOR_SCRIPT = `(function(){try{var k=${JSON.stringify(
  BUBBLE_COLOR_STORAGE_KEY
)},d=${JSON.stringify(DEFAULT_BUBBLE_COLOR)};var c=localStorage.getItem(k);c=/^#[0-9a-f]{6}$/i.test(c||"")?c:d;function ch(v){var r=v/255;return r<=0.03928?r/12.92:Math.pow((r+0.055)/1.055,2.4)}var r=parseInt(c.slice(1,3),16),g=parseInt(c.slice(3,5),16),b=parseInt(c.slice(5,7),16);var l=0.2126*ch(r)+0.7152*ch(g)+0.0722*ch(b);var t=(1.05/(l+0.05))>=(l+0.05)/0.05?"#FFFFFF":"#111111";var s=document.documentElement.style;s.setProperty(${JSON.stringify(
  BUBBLE_BACKGROUND_VAR
)},c.toUpperCase());s.setProperty(${JSON.stringify(
  BUBBLE_TEXT_VAR
)},t)}catch(e){}})();`;
