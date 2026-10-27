import assert from "node:assert/strict";
import { createECDH } from "node:crypto";
import test from "node:test";

import {
  PUSH_DISPATCH_SECRET_ENV,
  PUSH_DISPATCH_SECRET_FALLBACK_ENV,
  PUSH_PRIVATE_KEY_ENV,
  PUSH_PUBLIC_KEY_ENV,
  PUSH_SERVICE_ROLE_ENV,
  PUSH_SUBJECT_ENV,
  dispatchSecretFrom,
  missingPushSettingNames,
  pushEnvFlags,
} from "../src/lib/push-settings.ts";
import {
  normalizeVapidSubject,
  vapidKeyPairValid,
  vapidSubjectValid,
} from "../src/lib/push-keys.ts";

function keyPair() {
  const ecdh = createECDH("prime256v1");
  ecdh.generateKeys();
  return {
    publicKey: ecdh.getPublicKey().toString("base64url"),
    privateKey: ecdh.getPrivateKey().toString("base64url"),
  };
}

const allSet = {
  [PUSH_PUBLIC_KEY_ENV]: "public",
  [PUSH_PRIVATE_KEY_ENV]: "private",
  [PUSH_SUBJECT_ENV]: "mailto:max@example.com",
  [PUSH_SERVICE_ROLE_ENV]: "service-role",
  [PUSH_DISPATCH_SECRET_ENV]: "dispatch",
};

test("flags only say whether each name is set", () => {
  assert.deepEqual(pushEnvFlags(allSet), {
    publicKey: true,
    privateKey: true,
    subject: true,
    serviceRole: true,
    dispatchSecret: true,
  });
  assert.deepEqual(missingPushSettingNames(pushEnvFlags(allSet)), []);
});

test("a whitespace-only value counts as unset", () => {
  const flags = pushEnvFlags({ ...allSet, [PUSH_PRIVATE_KEY_ENV]: "   " });

  assert.equal(flags.privateKey, false);
  assert.deepEqual(missingPushSettingNames(flags), [PUSH_PRIVATE_KEY_ENV]);
});

test("missing settings are named, in a stable order", () => {
  const flags = pushEnvFlags({});

  assert.equal(flags.publicKey, false);
  assert.deepEqual(missingPushSettingNames(flags), [
    PUSH_PUBLIC_KEY_ENV,
    PUSH_PRIVATE_KEY_ENV,
    PUSH_SUBJECT_ENV,
    PUSH_SERVICE_ROLE_ENV,
    PUSH_DISPATCH_SECRET_ENV,
  ]);
});

test("the client is configured by the public key alone", () => {
  const flags = pushEnvFlags({ [PUSH_PUBLIC_KEY_ENV]: "only-the-public-key" });

  assert.equal(flags.publicKey, true);
  assert.equal(flags.privateKey, false);
  assert.equal(flags.subject, false);
  assert.equal(flags.serviceRole, false);
});

test("the dispatch secret prefers its own name and falls back to CRON_SECRET", () => {
  assert.equal(
    dispatchSecretFrom({
      [PUSH_DISPATCH_SECRET_ENV]: " dispatch ",
      [PUSH_DISPATCH_SECRET_FALLBACK_ENV]: "cron",
    }),
    "dispatch"
  );
  assert.equal(
    dispatchSecretFrom({ [PUSH_DISPATCH_SECRET_FALLBACK_ENV]: " cron " }),
    "cron"
  );
  assert.equal(
    dispatchSecretFrom({ [PUSH_DISPATCH_SECRET_ENV]: "   ", [PUSH_DISPATCH_SECRET_FALLBACK_ENV]: "cron" }),
    "cron"
  );
  assert.equal(dispatchSecretFrom({}), "");
});

test("the fallback secret still counts as configured", () => {
  const flags = pushEnvFlags({
    ...allSet,
    [PUSH_DISPATCH_SECRET_ENV]: "",
    [PUSH_DISPATCH_SECRET_FALLBACK_ENV]: "cron",
  });

  assert.equal(flags.dispatchSecret, true);
  assert.equal(missingPushSettingNames(flags).includes(PUSH_DISPATCH_SECRET_ENV), false);
});

test("a matching VAPID pair is valid and a mismatched one is not", () => {
  const first = keyPair();
  const second = keyPair();

  assert.equal(vapidKeyPairValid(first.publicKey, first.privateKey), true);
  assert.equal(vapidKeyPairValid(first.publicKey, second.privateKey), false);
});

test("a bare email subject becomes a mailto: address", () => {
  assert.equal(
    normalizeVapidSubject("max@example.com"),
    "mailto:max@example.com"
  );
  assert.equal(
    normalizeVapidSubject("mailto:max@example.com"),
    "mailto:max@example.com"
  );
  assert.equal(
    normalizeVapidSubject("https://max.example.com"),
    "https://max.example.com"
  );
  assert.equal(normalizeVapidSubject("  "), "");
});

test("the subject must be mailto: or https:", () => {
  assert.equal(vapidSubjectValid("max@example.com"), true);
  assert.equal(vapidSubjectValid("mailto:max@example.com"), true);
  assert.equal(vapidSubjectValid("https://max.example.com"), true);
  assert.equal(vapidSubjectValid("http://max.example.com"), false);
  assert.equal(vapidSubjectValid("Max team"), false);
  assert.equal(vapidSubjectValid(""), false);
});

test("malformed or missing VAPID keys are rejected", () => {
  const pair = keyPair();

  assert.equal(vapidKeyPairValid(undefined, pair.privateKey), false);
  assert.equal(vapidKeyPairValid(pair.publicKey, undefined), false);
  assert.equal(vapidKeyPairValid("not-a-key", pair.privateKey), false);
  assert.equal(vapidKeyPairValid(pair.publicKey, "short"), false);
});
