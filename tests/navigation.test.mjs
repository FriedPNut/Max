import assert from "node:assert/strict";
import test from "node:test";

import {
  TAB_ROOTS,
  TABS,
  clearOriginTab,
  getOriginTab,
  isRootTabPath,
  setOriginTab,
  tabForPath,
  tabRoot,
} from "../src/lib/tabs.ts";

test("each tab's root belongs to that tab and is the only swipe page", () => {
  for (const tab of TABS) {
    assert.equal(tabForPath(tab.root), tab.key);
    assert.equal(tabRoot(tab.key), tab.root);
    assert.equal(tab.root.split("/").filter(Boolean).length, 1);
    assert.equal(isRootTabPath(tab.root), true);
  }

  assert.equal(isRootTabPath("/events/one"), false);
  assert.equal(isRootTabPath("/chat/one"), false);
  assert.equal(isRootTabPath("/u/alice"), false);
});

test("tab roots are /events, /chat, /feed and /me", () => {
  assert.deepEqual(TAB_ROOTS, {
    events: "/events",
    chat: "/chat",
    post: "/feed",
    profile: "/me",
  });
});

test("events owns the event-adjacent pages that exist", () => {
  for (const path of [
    "/",
    "/events",
    "/events/abc",
    "/events/new",
    "/lists",
    "/lists/abc",
    "/trips",
    "/trips/abc",
    "/hang",
    "/free",
    "/birthdays",
    "/best-of",
    "/best-of/2026-03",
  ]) {
    assert.equal(tabForPath(path), "events", path);
  }
});

test("chat owns chat routes", () => {
  for (const path of ["/chat", "/chat/abc", "/chat/friends", "/chat/new"]) {
    assert.equal(tabForPath(path), "chat", path);
  }
});

test("post owns feed routes", () => {
  for (const path of ["/feed", "/feed/abc", "/feed/new"]) {
    assert.equal(tabForPath(path), "post", path);
  }
});

test("profile owns me, settings, notifications and recap routes", () => {
  for (const path of [
    "/me",
    "/me/edit",
    "/me/friends",
    "/settings",
    "/settings/appearance",
    "/settings/notifications",
    "/notifications",
    "/recap",
    "/wrapped/2026",
  ]) {
    assert.equal(tabForPath(path), "profile", path);
  }
});

test("shared pages belong to no tab", () => {
  for (const path of [
    "/u/alice",
    "/u/alice/friends",
    "/login",
    "/welcome",
    "/people",
  ]) {
    assert.equal(tabForPath(path), null, path);
  }
});

test("a shared page keeps the tab the person came from, until it is unknown", () => {
  clearOriginTab();
  assert.equal(getOriginTab(), null, "a refresh starts with no origin");

  setOriginTab("chat");
  assert.equal(getOriginTab(), "chat");

  // Leaving for a shared page must not clear or change it.
  setOriginTab(tabForPath("/u/alice"));
  assert.equal(getOriginTab(), "chat");

  setOriginTab(tabForPath("/feed"));
  assert.equal(getOriginTab(), "post");

  clearOriginTab();
  assert.equal(getOriginTab(), null);
});
