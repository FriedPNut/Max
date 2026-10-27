import assert from "node:assert/strict";
import test from "node:test";

import {
  GROUP_NAME_MAX_LENGTH,
  NICKNAME_MAX_LENGTH,
  addedNamesToast,
  chatHiddenAfterClear,
  cleanGroupName,
  cleanNickname,
  memberSubtitle,
  messageAfterClear,
  nicknameMap,
} from "../src/lib/chat-details.ts";

const now = "2026-10-26T12:00:00.000Z";
const earlier = "2026-10-26T11:00:00.000Z";
const later = "2026-10-26T13:00:00.000Z";

test("clearing hides older messages but keeps newer ones", () => {
  assert.equal(messageAfterClear(earlier, null), true);
  assert.equal(messageAfterClear(earlier, now), false);
  assert.equal(messageAfterClear(now, now), false, "the clear moment is cleared");
  assert.equal(messageAfterClear(later, now), true);
});

test("a cleared chat leaves the list until something newer arrives", () => {
  assert.equal(chatHiddenAfterClear(earlier, null), false);
  assert.equal(chatHiddenAfterClear(null, null), false);
  assert.equal(chatHiddenAfterClear(earlier, now), true);
  assert.equal(chatHiddenAfterClear(null, now), true, "an empty cleared chat is hidden");
  assert.equal(chatHiddenAfterClear(later, now), false);
});

test("nicknames are trimmed, capped and optional", () => {
  assert.equal(cleanNickname("  Sam  "), "Sam");
  assert.equal(cleanNickname(""), null);
  assert.equal(cleanNickname("   "), null);
  assert.equal(cleanNickname(null), null);
  assert.equal(
    cleanNickname("x".repeat(NICKNAME_MAX_LENGTH + 10)).length,
    NICKNAME_MAX_LENGTH
  );
});

test("group names are trimmed, capped and never empty", () => {
  assert.equal(cleanGroupName("  Weekend crew "), "Weekend crew");
  assert.equal(cleanGroupName(""), null);
  assert.equal(
    cleanGroupName("y".repeat(GROUP_NAME_MAX_LENGTH + 5)).length,
    GROUP_NAME_MAX_LENGTH
  );
});

test("only real nicknames map, blanks are ignored", () => {
  const map = nicknameMap([
    { user_id: "a", nickname: "Ace" },
    { user_id: "b", nickname: "   " },
    { user_id: "c", nickname: null },
  ]);

  assert.deepEqual([...map.keys()], ["a"]);
  assert.equal(map.get("a"), "Ace");
});

test("the member second line marks the admin, otherwise shows the full name", () => {
  assert.equal(
    memberSubtitle({ isCreator: true, username: "sam", fullName: "Sam Lee" }),
    "Admin · @sam"
  );
  assert.equal(
    memberSubtitle({ isCreator: true, username: null, fullName: "Sam Lee" }),
    "Admin"
  );
  assert.equal(
    memberSubtitle({ isCreator: false, username: "sam", fullName: "Sam Lee" }),
    "Sam Lee"
  );
});

test("the added toast names people naturally", () => {
  assert.equal(addedNamesToast([]), "Added");
  assert.equal(addedNamesToast(["Sam"]), "Added Sam");
  assert.equal(addedNamesToast(["Sam", "Alex"]), "Added Sam and Alex");
  assert.equal(
    addedNamesToast(["Sam", "Alex", "Jo"]),
    "Added Sam, Alex and 1 other"
  );
  assert.equal(
    addedNamesToast(["Sam", "Alex", "Jo", "Kit"]),
    "Added Sam, Alex and 2 others"
  );
});
