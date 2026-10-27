/**
 * Rules for the conversation Details screen. Pure functions only: they run in
 * tests, on the server and in the client without touching the network.
 */

export const NICKNAME_MAX_LENGTH = 30;
export const GROUP_NAME_MAX_LENGTH = 40;

function parse(value: string | null | undefined): number | null {
  if (!value) {
    return null;
  }

  const time = Date.parse(value);

  return Number.isFinite(time) ? time : null;
}

/** A cleared chat only shows what arrived after I cleared it. */
export function messageAfterClear(
  createdAt: string,
  clearedAt: string | null | undefined
): boolean {
  const cleared = parse(clearedAt);

  if (cleared === null) {
    return true;
  }

  const created = parse(createdAt);

  return created === null ? true : created > cleared;
}

/**
 * A cleared chat leaves the list until something newer arrives. No messages at
 * all also means the row is hidden.
 */
export function chatHiddenAfterClear(
  lastMessageAt: string | null | undefined,
  clearedAt: string | null | undefined
): boolean {
  const cleared = parse(clearedAt);

  if (cleared === null) {
    return false;
  }

  const last = parse(lastMessageAt);

  return last === null || last <= cleared;
}

export function cleanNickname(value: unknown): string | null {
  const text = String(value ?? "").trim();

  if (!text) {
    return null;
  }

  return text.slice(0, NICKNAME_MAX_LENGTH);
}

export function cleanGroupName(value: unknown): string | null {
  const text = String(value ?? "").trim();

  if (!text) {
    return null;
  }

  return text.slice(0, GROUP_NAME_MAX_LENGTH);
}

export function nicknameMap(
  rows: { user_id: string; nickname: string | null }[]
): Map<string, string> {
  const map = new Map<string, string>();

  for (const row of rows) {
    const nickname = cleanNickname(row.nickname);

    if (nickname) {
      map.set(row.user_id, nickname);
    }
  }

  return map;
}

/** "Admin · @sam" for the creator, the full name for everyone else. */
export function memberSubtitle({
  isCreator,
  username,
  fullName,
}: {
  isCreator: boolean;
  username: string | null;
  fullName: string;
}): string {
  if (isCreator) {
    return username ? `Admin · @${username}` : "Admin";
  }

  return fullName;
}

/** "Added Sam", "Added Sam and Alex", "Added Sam, Alex and 2 others". */
export function addedNamesToast(names: string[]): string {
  const clean = names.map((name) => name.trim()).filter(Boolean);

  if (clean.length === 0) {
    return "Added";
  }

  if (clean.length === 1) {
    return `Added ${clean[0]}`;
  }

  if (clean.length === 2) {
    return `Added ${clean[0]} and ${clean[1]}`;
  }

  return `Added ${clean[0]}, ${clean[1]} and ${clean.length - 2} ${
    clean.length - 2 === 1 ? "other" : "others"
  }`;
}
