import assert from "node:assert/strict";
import test from "node:test";

import {
  NOTIFICATION_TYPE_PREFERENCES,
  isNotificationTypeEnabled,
  notificationDisplayRows,
  notificationPreferenceKeyFor,
  notificationRowCount,
  notificationSectionFor,
  notificationSentence,
  notificationSections,
  notificationTitle,
} from "../src/lib/notifications.ts";
import { notificationDestination } from "../src/lib/routes.ts";

const TYPE_TO_SWITCH = {
  event_reminder: "push_reminders",
  new_event: "push_new_events",
  friend_request: "push_friends",
  friend_accepted: "push_friends",
  buddy_request: "push_friends",
  buddy_nudge: "push_friends",
  chat_message: "push_chat",
  hang_now: "push_hangs",
  new_post: "push_posts",
  post_comment: "push_social",
  trip_invite: "push_friends",
  birthday: "push_birthdays",
  weekly_recap: "push_recaps",
  wrapped: "push_recaps",
  best_of_month: "push_recaps",
};

test("every notification type maps to its preference switch", () => {
  assert.deepEqual({ ...NOTIFICATION_TYPE_PREFERENCES }, TYPE_TO_SWITCH);
  for (const [type, key] of Object.entries(TYPE_TO_SWITCH)) {
    assert.equal(notificationPreferenceKeyFor(type), key, type);
  }
});

test("unknown types have no switch and are never pushed", () => {
  assert.equal(notificationPreferenceKeyFor("mystery_type"), null);
  assert.equal(isNotificationTypeEnabled("mystery_type", null), false);
  assert.equal(isNotificationTypeEnabled("mystery_type", { push_enabled: true }), false);
});

test("a missing preference row defaults to sending", () => {
  assert.equal(isNotificationTypeEnabled("hang_now", null), true);
  assert.equal(isNotificationTypeEnabled("birthday", undefined), true);
});

test("the master switch disables every type", () => {
  for (const type of Object.keys(TYPE_TO_SWITCH)) {
    assert.equal(isNotificationTypeEnabled(type, { push_enabled: false, [TYPE_TO_SWITCH[type]]: true }), false, type);
  }
});

test("a type's own switch disables only that type", () => {
  assert.equal(isNotificationTypeEnabled("hang_now", { push_hangs: false }), false);
  assert.equal(isNotificationTypeEnabled("hang_now", { push_hangs: false, push_friends: true }), false);
  assert.equal(isNotificationTypeEnabled("trip_invite", { push_hangs: false }), true);
  assert.equal(isNotificationTypeEnabled("wrapped", { push_recaps: false }), false);
  assert.equal(isNotificationTypeEnabled("best_of_month", { push_recaps: true, push_social: false }), true);
});

test("null preferences are treated as on", () => {
  assert.equal(isNotificationTypeEnabled("birthday", { push_birthdays: null }), true);
});

test("titles fall back per type when the stored title is empty", () => {
  const base = {
    id: "1",
    user_id: "user",
    type: "post_comment",
    title: "",
    body: null,
    url: "/feed/post",
    data: null,
    created_at: "2026-10-24T00:00:00.000Z",
    read_at: null,
  };
  assert.equal(notificationTitle(base), "New comment");
  assert.equal(notificationTitle({ ...base, title: "Sam commented" }), "Sam commented");
  assert.equal(notificationTitle({ ...base, type: "hang_now" }), "Hang right now");
  assert.equal(notificationTitle({ ...base, type: "wrapped" }), "Max Wrapped");
  assert.equal(notificationTitle({ ...base, type: "best_of_month" }), "Photo of the month");
  assert.equal(notificationTitle({ ...base, type: "mystery_type" }), "Notification");
});

function row(overrides) {
  return {
    id: "1",
    user_id: "user",
    type: "new_post",
    title: "",
    body: null,
    url: null,
    data: null,
    created_at: "2026-10-24T00:00:00.000Z",
    read_at: null,
    ...overrides,
  };
}

test("types land in the five center sections", () => {
  assert.equal(notificationSectionFor("chat_message"), "chat");
  assert.equal(notificationSectionFor("friend_request"), "friends");
  assert.equal(notificationSectionFor("buddy_nudge"), "friends");
  assert.equal(notificationSectionFor("new_post"), "posts");
  assert.equal(notificationSectionFor("post_comment"), "posts");
  assert.equal(notificationSectionFor("birthday"), "events");
  assert.equal(notificationSectionFor("wrapped"), "other");
});

test("chat notifications collapse to one row per conversation", () => {
  const items = [
    row({ id: "a", type: "chat_message", created_at: "2026-10-24T10:00:00.000Z", data: { conversation_id: "c1", sender_name: "Sam" }, body: "Latest" }),
    row({ id: "b", type: "chat_message", created_at: "2026-10-24T09:00:00.000Z", data: { conversation_id: "c1", sender_name: "Sam" }, body: "Older" }),
    row({ id: "c", type: "chat_message", created_at: "2026-10-24T08:00:00.000Z", data: { conversation_id: "c2" }, body: "Other chat" }),
    row({ id: "d", type: "new_post", created_at: "2026-10-24T07:00:00.000Z", data: { actor_name: "Alex", post_id: "p1" } }),
  ];
  const rows = notificationDisplayRows(items);

  assert.equal(rows.length, 3);
  assert.equal(rows[0].kind, "chat");
  assert.equal(rows[0].conversationId, "c1");
  assert.deepEqual(rows[0].ids, ["a", "b"]);
  assert.equal(rows[0].count, 2);
  assert.equal(rows[0].latest.id, "a");
  assert.equal(notificationRowCount(items), 3);
});

test("sections keep their order and drop empty ones", () => {
  const sections = notificationSections([
    row({ id: "f", type: "friend_request", created_at: "2026-10-24T09:00:00.000Z" }),
    row({ id: "p", type: "new_post", created_at: "2026-10-24T10:00:00.000Z" }),
    row({ id: "w", type: "wrapped", created_at: "2026-10-24T08:00:00.000Z" }),
  ]);

  assert.deepEqual(sections.map((section) => section.label), ["Friends", "Posts", "Other"]);
  assert.equal(sections[0].rows.length, 1);
});

test("rows open their chat, post, event or person", () => {
  assert.equal(
    notificationDestination({ type: "chat_message", url: null, data: { conversation_id: "c1" } }),
    "/chat/c1"
  );
  assert.equal(
    notificationDestination({ type: "new_post", url: null, data: { post_id: "p1" } }),
    "/feed/p1"
  );
  assert.equal(
    notificationDestination({ type: "new_event", url: null, data: { event_id: "e1" } }),
    "/events/e1"
  );
  assert.equal(
    notificationDestination({ type: "friend_request", url: "/people", data: { actor_username: "sam" } }),
    "/u/sam"
  );
  assert.equal(
    notificationDestination({ type: "buddy_nudge", url: "/people", data: null }),
    "/people"
  );
});

test("sentences bold the person's name", () => {
  assert.deepEqual(notificationSentence(row({ data: { actor_name: "Alex" } })), {
    name: "Alex",
    before: "",
    after: " shared a new post",
  });
  assert.deepEqual(
    notificationSentence(row({ type: "birthday", data: { actor_name: "Sam" } })),
    { name: "Sam", before: "It’s ", after: "’s birthday" }
  );
  assert.deepEqual(notificationSentence(row({ type: "wrapped", data: null })), {
    name: null,
    before: "Max Wrapped",
    after: "",
  });
});
