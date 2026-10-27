import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

import manifest from "../src/app/manifest.ts";

const app = () => manifest();

/** Reads a PNG's real size from its IHDR chunk. */
function pngSize(url) {
  const bytes = readFileSync(url);

  assert.equal(
    bytes.subarray(1, 4).toString("ascii"),
    "PNG",
    `${url.pathname} is a PNG`
  );

  return {
    width: bytes.readUInt32BE(16),
    height: bytes.readUInt32BE(20),
  };
}

test("the manifest carries everything Chrome installs from", () => {
  const value = app();

  assert.equal(value.id, "/");
  assert.equal(value.name, "Max");
  assert.equal(value.short_name, "Max");
  assert.equal(value.start_url, "/events");
  assert.equal(value.scope, "/");
  assert.equal(value.display, "standalone");
  assert.equal(value.orientation, "portrait");
  assert.equal(value.lang, "en");
  assert.equal(value.background_color, "#0C1014");
  assert.equal(value.theme_color, "#0C1014");
  assert.deepEqual(value.categories, ["social"]);
  assert.equal(typeof value.description, "string");
  assert.ok((value.description ?? "").length > 0);
});

test("the manifest ships 192, 512 and a maskable 512 icon", () => {
  const icons = app().icons ?? [];
  const find = (sizes, purpose) =>
    icons.find(
      (icon) => icon.sizes === sizes && (icon.purpose ?? "any") === purpose
    );

  assert.ok(find("192x192", "any"), "192 any");
  assert.ok(find("512x512", "any"), "512 any");
  assert.ok(find("512x512", "maskable"), "512 maskable");

  for (const icon of icons) {
    assert.equal(icon.type, "image/png", icon.src);
    assert.match(icon.src ?? "", /^\/icons\/[a-z0-9-]+\.png$/);
  }
});

test("every manifest icon is a real PNG at the size it declares", () => {
  for (const icon of app().icons ?? []) {
    const file = new URL(`../public${icon.src}`, import.meta.url);

    assert.equal(existsSync(file), true, `${icon.src} exists`);

    const [width, height] = (icon.sizes ?? "").split("x").map(Number);
    assert.deepEqual(pngSize(file), { width, height }, icon.src);
  }
});

test("the favicon and Apple touch icon Next serves are the right sizes", () => {
  const apple = new URL("../src/app/apple-icon.png", import.meta.url);

  assert.equal(existsSync(apple), true, "apple-icon.png exists");
  assert.deepEqual(pngSize(apple), { width: 180, height: 180 });

  const ico = readFileSync(new URL("../src/app/favicon.ico", import.meta.url));

  assert.equal(ico.readUInt16LE(0), 0, "reserved");
  assert.equal(ico.readUInt16LE(2), 1, "icon resource");
  assert.equal(ico.readUInt16LE(4), 3, "three sizes");

  const sizes = [];

  for (let index = 0; index < 3; index++) {
    const entry = 6 + index * 16;
    const length = ico.readUInt32LE(entry + 8);
    const offset = ico.readUInt32LE(entry + 12);

    sizes.push(ico[entry] === 0 ? 256 : ico[entry]);
    assert.equal(
      ico.subarray(offset + 1, offset + 4).toString("ascii"),
      "PNG",
      `entry ${index} embeds a PNG`
    );
    assert.ok(length > 0);
  }

  assert.deepEqual(sizes, [48, 32, 16]);
});
