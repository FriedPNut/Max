import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";

import { THEME_SCRIPT } from "../src/lib/theme-script.ts";
import { THEME_COLORS, resolveTheme } from "../src/lib/theme.ts";

function runScript({ stored, systemDark, storageThrows = false }) {
  const root = { dataset: {}, style: {}, attrs: {}, setAttribute(name, value) { this.attrs[name] = value; } };
  const context = {
    localStorage: {
      getItem() {
        if (storageThrows) throw new Error("blocked");
        return stored ?? null;
      },
    },
    window: { matchMedia: () => ({ matches: systemDark }) },
    document: { documentElement: root },
  };

  vm.createContext(context);
  vm.runInContext(THEME_SCRIPT, context);
  return root.attrs["data-theme"];
}

test("a stored dark choice wins over a light system", () => {
  assert.equal(runScript({ stored: "dark", systemDark: false }), "dark");
});

test("a stored light choice wins over a dark system", () => {
  assert.equal(runScript({ stored: "light", systemDark: true }), "light");
});

test("system is used when nothing is stored", () => {
  assert.equal(runScript({ systemDark: true }), "dark");
  assert.equal(runScript({ systemDark: false }), "light");
});

test("an unknown stored value falls back to the system", () => {
  assert.equal(runScript({ stored: "purple", systemDark: true }), "dark");
});

test("blocked storage falls back safely", () => {
  assert.equal(runScript({ storageThrows: true, systemDark: false }), "light");
});

test("resolveTheme follows the choice and the system", () => {
  globalThis.window = { matchMedia: () => ({ matches: true }) };
  assert.equal(resolveTheme("dark"), "dark");
  assert.equal(resolveTheme("light"), "light");
  assert.equal(resolveTheme("system"), "dark");

  globalThis.window = { matchMedia: () => ({ matches: false }) };
  assert.equal(resolveTheme("system"), "light");
  delete globalThis.window;
});

test("theme colors match the design tokens", () => {
  assert.deepEqual(THEME_COLORS, { light: "#F4F4F4", dark: "#000000" });
});
