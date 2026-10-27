import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const room = readFileSync("src/components/chat/chat-room.tsx", "utf8");
const loading = readFileSync("src/app/chat/[id]/loading.tsx", "utf8");

// The composer used to be position: fixed inside the scrolling page wrapper,
// so its bottom edge followed the content height. These are the invariants
// that make the frame independent of the message count.

test("the conversation is its own fixed flex column", () => {
  const root = /data-chat-screen[\s\S]{0,200}?className="([^"]+)"/.exec(room);

  assert.ok(root, "the room has one screen element");
  assert.match(root[1], /fixed/);
  assert.match(root[1], /inset-0/);
  assert.match(root[1], /h-\[100dvh\]/);
  assert.match(root[1], /flex-col/);
});

test("the message area is the only scroller and takes the leftover height", () => {
  assert.match(
    room,
    /className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain"/
  );
  // No justify-content: flex-end on a scroll container.
  const area = /data-chat-scroll[\s\S]{0,160}?className="([^"]+)"/.exec(room);
  assert.ok(area);
  assert.doesNotMatch(area[1], /justify-end/);
});

test("an auto-margin spacer bottom-aligns short conversations", () => {
  const column = /flex min-h-full flex-col px-3 pb-3([\s\S]{0,120})/.exec(room);
  assert.ok(column);
  assert.match(column[1], /<div className="mt-auto"/);
});

test("the composer is a sibling after the message area, not fixed", () => {
  const scrollAt = room.indexOf("data-chat-scroll");
  const formAt = room.indexOf("<form");

  assert.ok(scrollAt > 0 && formAt > scrollAt, "composer follows the list");
  assert.match(room, /className="flex-none border-t border-line bg-thread"/);
  assert.doesNotMatch(room, /fixed inset-x-0 z-30 border-t/);
  // The old spacer that existed to clear the fixed bar is gone.
  assert.doesNotMatch(room, /h-36/);
});

test("the loading skeleton uses the same frame and already shows the bar", () => {
  assert.match(loading, /fixed inset-0 flex h-\[100dvh\] flex-col/);
  assert.ok(loading.indexOf("min-h-0 flex-1") < loading.indexOf("border-t border-line"));
});
