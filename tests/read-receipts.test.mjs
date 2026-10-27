import assert from "node:assert/strict";
import test from "node:test";

import {
  RECEIPT_WRITE_INTERVAL_MS,
  hasSeen,
  readReceiptPayload,
  readReceiptsOn,
  receiptWriteDelay,
  receiptsByMessage,
  seenByLabel,
  seenLabel,
  shortAgo,
} from "../src/lib/read-receipts.ts";

const t = (minutes) => new Date(Date.UTC(2026, 9, 26, 12, minutes)).toISOString();

test("a receipt counts only when it is later than the message", () => {
  assert.equal(hasSeen(t(5), t(4)), true);
  assert.equal(hasSeen(t(4), t(4)), false);
  assert.equal(hasSeen(t(3), t(4)), false);
  assert.equal(hasSeen(null, t(4)), false);
});

test("seen carries a short time only after an hour", () => {
  const now = Date.parse(t(120));

  assert.equal(seenLabel(t(119), now), "Seen");
  assert.equal(seenLabel(t(59), now), "Seen 1h ago");
  assert.equal(seenLabel(t(60), now), "Seen 1h ago");
  assert.equal(seenLabel(new Date(now - 2 * 60 * 60 * 1000).toISOString(), now), "Seen 2h ago");
  assert.equal(seenLabel(new Date(now - 26 * 60 * 60 * 1000).toISOString(), now), "Seen 1d ago");
});

test("short relative times choose minutes, hours and days", () => {
  assert.equal(shortAgo(5 * 60_000), "5m ago");
  assert.equal(shortAgo(2 * 60 * 60_000), "2h ago");
  assert.equal(shortAgo(3 * 24 * 60 * 60_000), "3d ago");
  assert.equal(shortAgo(1_000), "1m ago");
});

test("group receipts read as Seen by one person or plus N", () => {
  assert.equal(seenByLabel([]), null);
  assert.equal(seenByLabel(["Elina"]), "Seen by Elina");
  assert.equal(seenByLabel(["Elina", "Sam"]), "Seen by Elina + 1");
  assert.equal(
    seenByLabel(["Elina", "Sam", "Alex", "Jo", "Kit"]),
    "Seen by Elina + 4"
  );
});

test("each person's seen_at lands on their last-seen message", () => {
  const messages = [
    { id: "m1", created_at: t(0) },
    { id: "m2", created_at: t(10) },
    { id: "m3", created_at: t(20) },
  ];
  const map = receiptsByMessage(messages, [
    { id: "elina", seenAt: t(15), receiptsOn: true },
    { id: "sam", seenAt: t(25), receiptsOn: true },
    { id: "off", seenAt: t(25), receiptsOn: false },
    { id: "me", seenAt: t(25), receiptsOn: true, isMe: true },
    { id: "quiet", seenAt: null, receiptsOn: true },
    { id: "early", seenAt: new Date(Date.UTC(2026, 9, 26, 11)).toISOString(), receiptsOn: true },
  ]);

  assert.deepEqual([...map.keys()].sort(), ["m2", "m3"]);
  assert.deepEqual(map.get("m2").map((m) => m.id), ["elina"]);
  assert.deepEqual(map.get("m3").map((m) => m.id), ["sam"]);
});

test("several receipts on one message are ordered newest first", () => {
  const messages = [{ id: "m1", created_at: t(0) }];
  const map = receiptsByMessage(messages, [
    { id: "older", seenAt: t(5), receiptsOn: true },
    { id: "newer", seenAt: t(9), receiptsOn: true },
  ]);

  assert.deepEqual(map.get("m1").map((m) => m.id), ["newer", "older"]);
});

test("writes are throttled to one every two seconds", () => {
  assert.equal(receiptWriteDelay(0, 0), RECEIPT_WRITE_INTERVAL_MS);
  assert.equal(receiptWriteDelay(0, 500), 1_500);
  assert.equal(receiptWriteDelay(0, RECEIPT_WRITE_INTERVAL_MS), 0);
  assert.equal(receiptWriteDelay(0, 10_000), 0);
});

test("last_read_at is always written, seen_at only with receipts on", () => {
  const now = new Date("2026-10-26T12:00:00.000Z");
  const on = readReceiptPayload(true, now);
  const off = readReceiptPayload(false, now);

  assert.equal(on.last_read_at, now.toISOString());
  assert.equal(on.seen_at, now.toISOString());
  assert.equal(off.last_read_at, now.toISOString());
  assert.equal("seen_at" in off, false);
});

test("read receipts default to on", () => {
  assert.equal(readReceiptsOn(null), true);
  assert.equal(readReceiptsOn({}), true);
  assert.equal(readReceiptsOn({ read_receipts: null }), true);
  assert.equal(readReceiptsOn({ read_receipts: true }), true);
  assert.equal(readReceiptsOn({ read_receipts: false }), false);
});
