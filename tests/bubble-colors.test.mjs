import assert from "node:assert/strict";
import test from "node:test";

import {
  BUBBLE_COLORS,
  BUBBLE_COLOR_SCRIPT,
  BUBBLE_COLOR_STORAGE_KEY,
  DEFAULT_BUBBLE_COLOR,
  bubbleTextColor,
  contrastRatio,
  normalizeHex,
} from "../src/lib/bubble-colors.ts";

test("hex colors are normalized, anything else is rejected", () => {
  assert.equal(normalizeHex("#8b3beb"), "#8B3BEB");
  assert.equal(normalizeHex("3797f0"), "#3797F0");
  assert.equal(normalizeHex(" #0EA5A5 "), "#0EA5A5");

  for (const bad of ["", "red", "#8b3be", "#8b3beb1", "rgb(1,2,3)", null]) {
    assert.equal(normalizeHex(bad), null, String(bad));
  }
});

test("the palette is eight valid colors and holds the default", () => {
  assert.equal(BUBBLE_COLORS.length, 8);

  for (const color of BUBBLE_COLORS) {
    assert.equal(normalizeHex(color.hex), color.hex, color.name);
  }

  assert.ok(BUBBLE_COLORS.some((color) => color.hex === DEFAULT_BUBBLE_COLOR));
});

test("bubble text is whichever of white and black reads better", () => {
  for (const color of BUBBLE_COLORS) {
    const white = contrastRatio(color.hex, "#FFFFFF");
    const black = contrastRatio(color.hex, "#000000");
    const expected = white >= black ? "#FFFFFF" : "#111111";

    assert.equal(bubbleTextColor(color.hex), expected, color.name);
  }

  assert.equal(bubbleTextColor("#8B3BEB"), "#FFFFFF", "purple keeps white text");
  assert.equal(bubbleTextColor("#FF7A1A"), "#111111", "orange needs dark text");
});

test("contrast is checked against the actual text color", () => {
  for (const color of BUBBLE_COLORS) {
    const text = bubbleTextColor(color.hex);

    assert.ok(
      contrastRatio(color.hex, text) >= 3,
      `${color.name} should stay readable`
    );
    assert.ok(
      contrastRatio(color.hex, text) >=
        contrastRatio(color.hex, text === "#FFFFFF" ? "#111111" : "#FFFFFF")
    );
  }
});

test("the startup script writes the background and text variables", () => {
  assert.ok(BUBBLE_COLOR_SCRIPT.includes(BUBBLE_COLOR_STORAGE_KEY));
  assert.ok(BUBBLE_COLOR_SCRIPT.includes("--bubble-mine"));
  assert.ok(BUBBLE_COLOR_SCRIPT.includes("--bubble-mine-text"));
  assert.ok(BUBBLE_COLOR_SCRIPT.includes(DEFAULT_BUBBLE_COLOR));
  // Self-contained: it must not wait for React to hydrate.
  assert.doesNotThrow(() => new Function(BUBBLE_COLOR_SCRIPT));
});
