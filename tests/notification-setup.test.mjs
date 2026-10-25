import assert from "node:assert/strict";
import test from "node:test";

import { notificationSetupStateFor } from "../src/lib/notification-setup-state.ts";

const base = {
  vapidKeyPresent: true,
  supported: true,
  iosNeedsInstall: false,
  permission: "granted",
  pushEnabled: true,
  hasSubscription: true,
  serverHasEndpoint: true,
};

const decide = (overrides = {}) => notificationSetupStateFor({ ...base, ...overrides });

test("a missing VAPID key means not configured", () => {
  assert.equal(decide({ vapidKeyPresent: false }), "not-configured");
  assert.equal(
    decide({ vapidKeyPresent: false, supported: false, permission: "denied" }),
    "not-configured"
  );
});

test("an unsupported browser is reported as unsupported", () => {
  assert.equal(decide({ supported: false }), "unsupported");
});

test("iPhone outside the home screen needs an install", () => {
  assert.equal(decide({ iosNeedsInstall: true, permission: "default" }), "ios-needs-install");
});

test("a denied permission is blocked before anything else", () => {
  assert.equal(decide({ permission: "denied" }), "blocked");
  assert.equal(decide({ permission: "denied", pushEnabled: false }), "blocked");
  assert.equal(decide({ permission: "denied", hasSubscription: false }), "blocked");
});

test("the master switch off wins over an unasked permission", () => {
  assert.equal(decide({ pushEnabled: false, permission: "default" }), "app-off");
  assert.equal(decide({ pushEnabled: false, permission: "granted", hasSubscription: false }), "app-off");
});

test("permission not asked yet is not-asked", () => {
  assert.equal(decide({ permission: "default" }), "not-asked");
});

test("granted but unsubscribed asks for a quiet repair", () => {
  assert.equal(decide({ hasSubscription: false }), "needs-repair");
});

test("granted and subscribed but missing on the server asks for a quiet repair", () => {
  assert.equal(decide({ serverHasEndpoint: false }), "needs-repair");
});

test("granted, subscribed and saved is ready", () => {
  assert.equal(decide(), "ready");
});

test("an endpoint check that cannot run does not trigger repairs", () => {
  assert.equal(decide({ serverHasEndpoint: null }), "ready");
});

test("the endpoint check is ignored when there is no subscription", () => {
  assert.equal(
    decide({ hasSubscription: false, serverHasEndpoint: false }),
    "needs-repair"
  );
});
