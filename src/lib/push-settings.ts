/**
 * The only names push notifications read. Kept in one plain module (no env
 * access, no server imports) so the browser can name a missing setting without
 * ever bundling a server-only value.
 */
export const PUSH_PUBLIC_KEY_ENV = "NEXT_PUBLIC_VAPID_PUBLIC_KEY";
export const PUSH_PRIVATE_KEY_ENV = "VAPID_PRIVATE_KEY";
export const PUSH_SUBJECT_ENV = "VAPID_SUBJECT";
export const PUSH_SERVICE_ROLE_ENV = "SUPABASE_SERVICE_ROLE_KEY";
export const PUSH_DISPATCH_SECRET_ENV = "NOTIFICATION_DISPATCH_SECRET";
/** Older deployments only set this one; it is still accepted. */
export const PUSH_DISPATCH_SECRET_FALLBACK_ENV = "CRON_SECRET";

export type PushEnvFlags = {
  publicKey: boolean;
  privateKey: boolean;
  subject: boolean;
  serviceRole: boolean;
  dispatchSecret: boolean;
};

type Env = Record<string, string | undefined>;

function present(env: Env, name: string) {
  const value = env[name];
  return typeof value === "string" && value.trim().length > 0;
}

/** The dispatch secret prefers its own name and falls back to CRON_SECRET. */
export function dispatchSecretFrom(env: Env = {}): string {
  const primary = env[PUSH_DISPATCH_SECRET_ENV];
  const fallback = env[PUSH_DISPATCH_SECRET_FALLBACK_ENV];
  const secret =
    typeof primary === "string" ? primary.trim() : "";

  if (secret) {
    return secret;
  }

  return typeof fallback === "string" ? fallback.trim() : "";
}

export function pushEnvFlags(env: Env = {}): PushEnvFlags {
  return {
    publicKey: present(env, PUSH_PUBLIC_KEY_ENV),
    privateKey: present(env, PUSH_PRIVATE_KEY_ENV),
    subject: present(env, PUSH_SUBJECT_ENV),
    serviceRole: present(env, PUSH_SERVICE_ROLE_ENV),
    dispatchSecret: Boolean(dispatchSecretFrom(env)),
  };
}

/** Setting names only — never their values. */
export function missingPushSettingNames(flags: PushEnvFlags): string[] {
  const missing: string[] = [];

  if (!flags.publicKey) missing.push(PUSH_PUBLIC_KEY_ENV);
  if (!flags.privateKey) missing.push(PUSH_PRIVATE_KEY_ENV);
  if (!flags.subject) missing.push(PUSH_SUBJECT_ENV);
  if (!flags.serviceRole) missing.push(PUSH_SERVICE_ROLE_ENV);
  if (!flags.dispatchSecret) missing.push(PUSH_DISPATCH_SECRET_ENV);

  return missing;
}
