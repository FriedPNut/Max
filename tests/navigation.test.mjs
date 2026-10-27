import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import test from "node:test";

import {
  TAB_ROOTS,
  TABS,
  isFullScreenPath,
  isImmersivePath,
  isRootTabPath,
  tabForPath,
  tabRoot,
} from "../src/lib/tabs.ts";

test("only an open conversation takes over the whole window", () => {
  assert.equal(isImmersivePath("/chat/abc"), true);

  for (const path of [
    "/chat",
    "/chat/friends",
    "/chat/new",
    "/chat/abc/details",
  ]) {
    assert.equal(isImmersivePath(path), false, path);
  }
});

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

test("every tab root is a real page, so a tab tap can never 404", () => {
  for (const root of Object.values(TAB_ROOTS)) {
    assert.equal(
      existsSync(new URL(`../src/app${root}/page.tsx`, import.meta.url)),
      true,
      root
    );
  }
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

test("chat owns chat routes and people", () => {
  for (const path of [
    "/chat",
    "/chat/abc",
    "/chat/friends",
    "/chat/new",
    "/people",
    "/people/added",
  ]) {
    assert.equal(tabForPath(path), "chat", path);
  }
});

test("post owns feed routes", () => {
  for (const path of ["/feed", "/feed/abc", "/feed/new"]) {
    assert.equal(tabForPath(path), "post", path);
  }
});

test("profile owns me, settings, recap and wrapped routes", () => {
  for (const path of [
    "/me",
    "/me/edit",
    "/me/friends",
    "/settings",
    "/settings/appearance",
    "/settings/notifications",
    "/recap",
    "/wrapped/2026",
  ]) {
    assert.equal(tabForPath(path), "profile", path);
  }
});

test("shared pages belong to no tab and highlight nothing", () => {
  for (const path of [
    "/u/alice",
    "/u/alice/friends",
    "/notifications",
    "/login",
    "/welcome",
  ]) {
    assert.equal(tabForPath(path), null, path);
  }
});

test("the active tab never depends on where you came from", () => {
  // Same path, same answer, before and after visiting other tabs.
  assert.equal(tabForPath("/u/alice"), null);
  assert.equal(tabForPath("/me"), "profile");
  assert.equal(tabForPath("/u/alice"), null);
  assert.equal(tabForPath("/chat"), "chat");
  assert.equal(tabForPath("/u/alice"), null);
});

test("the tab bar steps aside on auth, composer and conversation screens", () => {
  for (const path of [
    "/login",
    "/welcome",
    "/chat/new",
    "/chat/abc",
    "/chat/abc/details",
    "/feed/new",
    "/events/new",
    "/events/abc/edit",
    "/me/edit",
    "/wrapped/2026",
  ]) {
    assert.equal(isFullScreenPath(path), true, path);
  }

  for (const path of [
    "/",
    "/events",
    "/events/abc",
    "/chat",
    "/chat/friends",
    "/feed",
    "/feed/abc",
    "/me",
    "/settings",
    "/people",
    "/u/alice",
  ]) {
    assert.equal(isFullScreenPath(path), false, path);
  }
});
