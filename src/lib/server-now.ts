import { connection } from "next/server";

/**
 * The current time for a Server Component.
 *
 * `await connection()` makes the page render per request, so the clock is
 * read at request time and never baked into prerendered HTML.
 */
export async function serverNow(): Promise<number> {
  await connection();
  return Date.now();
}

/** Same as `serverNow`, as the ISO string most queries take. */
export async function serverNowIso(): Promise<string> {
  return new Date(await serverNow()).toISOString();
}
