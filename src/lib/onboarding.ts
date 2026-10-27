/** Shared onboarding constants. Safe to import from both client and server. */

export const ONBOARDED_COOKIE = "max-onboarded";

/** Set and confirmed on the profile row. */
export const ONBOARDED_SET = "1";

/**
 * The profile save failed, so the person was let in anyway. The next page load
 * retries the save and flips the cookie back to `1`.
 */
export const ONBOARDED_PENDING = "pending";

/** One year, path-wide, SameSite=Lax. Not sensitive, so not httpOnly. */
export const ONBOARDED_COOKIE_OPTIONS = {
  path: "/",
  maxAge: 60 * 60 * 24 * 365,
  sameSite: "lax" as const,
  httpOnly: false,
};

/** A valid username guess from the display name, trimmed to the 3–20 rule. */
export function suggestUsername(name: string, userId: string) {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, "")
    .slice(0, 20);

  if (base.length >= 3) {
    return base;
  }

  const digits = userId.replace(/\D/g, "");
  const suffix = (base + digits).slice(0, 20);
  return suffix.length >= 3 ? suffix : `${suffix}max`.slice(0, 20);
}
