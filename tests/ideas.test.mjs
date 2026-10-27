import assert from "node:assert/strict";
import test from "node:test";

import {
  IDEA_SHARE_NOTE_LIMIT,
  applyIdeaPatch,
  applyIdeaRemoval,
  canMakeEvent,
  ideaCardFromItem,
  ideaEventHref,
  ideaIdsFromMessages,
  ideaVoteToggle,
  makeEventHref,
  mergeIdeaCard,
  messagePreview,
  shareNote,
  shareToast,
  uniqueIdeaIds,
} from "../src/lib/ideas.ts";

const IDEA_ID = "8a7f3b0e-9d21-4a48-9f3a-2b1c4d5e6f70";
const OTHER_ID = "1b2c3d4e-5f60-4a7b-8c9d-0e1f2a3b4c5d";

const item = {
  id: IDEA_ID,
  title: "Rooftop movie night",
  description: "Bring blankets.",
  creatorName: "Elina",
  status: "open",
  eventId: null,
  createdAt: "2026-10-20T10:00:00.000Z",
  voteCount: 3,
  hasVoted: false,
  isCreator: false,
};

test("only an open idea can become an event", () => {
  assert.equal(canMakeEvent("open"), true);
  assert.equal(canMakeEvent("scheduled"), false);
  assert.equal(canMakeEvent("dropped"), false);
  assert.equal(canMakeEvent(null), false);
});

test("the card keeps the row's idea state", () => {
  const card = ideaCardFromItem(item);

  assert.equal(card.id, IDEA_ID);
  assert.equal(card.title, item.title);
  assert.equal(card.status, "open");
  assert.equal(card.voteCount, 3);
  assert.equal(card.eventId, null);
});

test("a patch fills in fields the update leaves out", () => {
  const started = mergeIdeaCard(null, { id: IDEA_ID, title: "Movie night" });

  assert.deepEqual(started, {
    id: IDEA_ID,
    title: "Movie night",
    description: null,
    status: "open",
    eventId: null,
    voteCount: 0,
    hasVoted: false,
    isCreator: false,
  });

  const scheduled = mergeIdeaCard(started, {
    id: IDEA_ID,
    status: "scheduled",
    eventId: "event-1",
  });

  assert.equal(scheduled.title, "Movie night");
  assert.equal(scheduled.status, "scheduled");
  assert.equal(scheduled.eventId, "event-1");
});

test("card maps take patches and removal placeholders", () => {
  let cards = { [IDEA_ID]: ideaCardFromItem(item) };

  cards = applyIdeaPatch(cards, {
    id: IDEA_ID,
    voteCount: 4,
    hasVoted: true,
  });
  assert.equal(cards[IDEA_ID].voteCount, 4);
  assert.equal(cards[IDEA_ID].hasVoted, true);
  assert.equal(cards[IDEA_ID].title, "Rooftop movie night");

  cards = applyIdeaRemoval(cards, IDEA_ID);
  assert.equal(cards[IDEA_ID], null);

  // A card that is gone never turns back into a full card from a stale patch.
  const unchanged = applyIdeaPatch(cards, { id: IDEA_ID, voteCount: 9 });
  assert.equal(unchanged[IDEA_ID], null);
  assert.equal(unchanged, cards);
});

test("idea ids are pulled from messages without duplicates or junk", () => {
  assert.deepEqual(
    ideaIdsFromMessages([
      { idea_id: IDEA_ID },
      { idea_id: OTHER_ID },
      { idea_id: IDEA_ID },
      { idea_id: null },
      { idea_id: "not-an-id" },
      {},
    ]),
    [IDEA_ID, OTHER_ID]
  );

  assert.deepEqual(uniqueIdeaIds([IDEA_ID, IDEA_ID, "nope", null, 42]), [
    IDEA_ID,
  ]);
});

test("a share note is trimmed and capped", () => {
  assert.equal(shareNote("   "), null);
  assert.equal(shareNote(null), null);
  assert.equal(shareNote("  this one  "), "this one");
  assert.equal(shareNote("x".repeat(IDEA_SHARE_NOTE_LIMIT + 50)).length, IDEA_SHARE_NOTE_LIMIT);
});

test("chat previews never come out blank for a shared idea", () => {
  assert.equal(
    messagePreview({ body: "Come along", idea_id: IDEA_ID, image_path: null }),
    "Come along"
  );
  assert.equal(
    messagePreview({ body: null, idea_id: IDEA_ID, image_path: null }),
    "Shared an idea"
  );
  assert.equal(
    messagePreview({ body: null, idea_id: null, image_path: "chat/a.jpg" }),
    "Sent a photo"
  );
  assert.equal(
    messagePreview({ body: null, idea_id: null, image_path: null }),
    null
  );
});

test("vote toggling flips the state and never goes negative", () => {
  assert.deepEqual(ideaVoteToggle(3, false), { voteCount: 4, hasVoted: true });
  assert.deepEqual(ideaVoteToggle(3, true), { voteCount: 2, hasVoted: false });
  assert.deepEqual(ideaVoteToggle(0, true), { voteCount: 0, hasVoted: false });
});

test("share toasts count the chats that were sent", () => {
  assert.equal(shareToast(1), "Sent to 1 chat");
  assert.equal(shareToast(3), "Sent to 3 chats");
  assert.equal(shareToast(0), "Nothing was sent. Try again.");
});

test("links for the card actions point at the right screens", () => {
  assert.equal(makeEventHref(IDEA_ID), `/events/new?idea=${IDEA_ID}`);
  assert.equal(ideaEventHref("event-9"), "/events/event-9");
  assert.equal(ideaEventHref(null), null);
});
