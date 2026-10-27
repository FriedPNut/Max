import "server-only";
import { normalizeVapidSubject, vapidKeyPairValid, vapidSubjectValid } from "@/lib/push-keys";
import {
  PUSH_PRIVATE_KEY_ENV,
  PUSH_PUBLIC_KEY_ENV,
  PUSH_SUBJECT_ENV,
  dispatchSecretFrom,
  missingPushSettingNames,
  pushEnvFlags,
  type PushEnvFlags,
} from "@/lib/push-settings";

export type PushServerStatus = {
  flags: PushEnvFlags;
  /** Names only; never the value behind them. */
  missing: string[];
  vapidPairValid: boolean;
  /** The subject must be an https: URL or a mailto: address. */
  subjectValid: boolean;
};

/** Everything the debug panel and the delivery path need, without values. */
export function pushServerStatus(
  env: NodeJS.ProcessEnv = process.env
): PushServerStatus {
  const flags = pushEnvFlags(env);

  return {
    flags,
    missing: missingPushSettingNames(flags),
    vapidPairValid: vapidKeyPairValid(
      env[PUSH_PUBLIC_KEY_ENV],
      env[PUSH_PRIVATE_KEY_ENV]
    ),
    subjectValid: vapidSubjectValid(env[PUSH_SUBJECT_ENV]),
  };
}

/** A bare email is turned into mailto: so web-push accepts it. */
export function pushVapidSubject(env: NodeJS.ProcessEnv = process.env) {
  return normalizeVapidSubject(env[PUSH_SUBJECT_ENV]);
}

export function pushDispatchSecret(env: NodeJS.ProcessEnv = process.env) {
  return dispatchSecretFrom(env);
}
