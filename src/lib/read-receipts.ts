/**
 * Read receipts, Instagram style. My own unread tracking uses last_read_at;
 * seen_at is the timestamp other people are allowed to see. Pure helpers here
 * so the rules stay testable.
 */

export type ReceiptMember = {
  id: string;
  seenAt: string | null;
  receiptsOn: boolean;
  /** Filled in from the chat's member list when avatars are drawn. */
  name?: string;
  initial?: string;
  avatarUrl?: string | null;
  isMe?: boolean;
};

/** At most one member-row write every two seconds. */
export const RECEIPT_WRITE_INTERVAL_MS = 2_000;
/** "Seen" gains a short relative time once it is an hour old. */
export const SEEN_RELATIVE_AFTER_MS = 60 * 60 * 1000;
/** Avatars shown under a message before collapsing into "+N". */
export const RECEIPT_AVATAR_LIMIT = 5;

function parse(value: string | null | undefined): number | null {
  if (!value) {
    return null;
  }

  const time = Date.parse(value);

  return Number.isFinite(time) ? time : null;
}

/** A receipt only counts when it is strictly later than the message. */
export function hasSeen(
  seenAt: string | null | undefined,
  messageAt: string
): boolean {
  const seen = parse(seenAt);
  const sent = parse(messageAt);

  if (seen === null || sent === null) {
    return false;
  }

  return seen > sent;
}

export function shortAgo(deltaMs: number): string {
  const minutes = Math.max(1, Math.round(deltaMs / 60_000));

  if (minutes < 60) {
    return `${minutes}m ago`;
  }

  const hours = Math.round(minutes / 60);

  if (hours < 24) {
    return `${hours}h ago`;
  }

  return `${Math.round(hours / 24)}d ago`;
}

/** "Seen" for the first hour, then "Seen 2h ago". */
export function seenLabel(seenAt: string | null | undefined, now: number): string {
  const seen = parse(seenAt);

  if (seen === null) {
    return "Seen";
  }

  const age = now - seen;

  if (age < SEEN_RELATIVE_AFTER_MS) {
    return "Seen";
  }

  return `Seen ${shortAgo(age)}`;
}

/** "Seen by Elina", "Seen by Elina + 4". */
export function seenByLabel(names: string[]): string | null {
  const clean = names.map((name) => name.trim()).filter(Boolean);

  if (clean.length === 0) {
    return null;
  }

  if (clean.length === 1) {
    return `Seen by ${clean[0]}`;
  }

  return `Seen by ${clean[0]} + ${clean.length - 1}`;
}

/**
 * Which message each person's seen_at falls on: their last-seen message. People
 * with receipts off are never included, and my own marker is dropped.
 */
export function receiptsByMessage<T extends { id: string; created_at: string }>(
  messages: T[],
  members: ReceiptMember[]
): Map<string, ReceiptMember[]> {
  const ordered = messages
    .map((message) => ({ message, at: parse(message.created_at) }))
    .filter((entry): entry is { message: T; at: number } => entry.at !== null)
    .sort((a, b) => a.at - b.at);

  const byMessage = new Map<string, ReceiptMember[]>();

  for (const member of members) {
    if (!member.receiptsOn || member.isMe || !member.seenAt) {
      continue;
    }

    const seen = parse(member.seenAt);

    if (seen === null) {
      continue;
    }

    let match: T | null = null;

    for (const entry of ordered) {
      if (entry.at > seen) {
        break;
      }

      match = entry.message;
    }

    if (!match) {
      continue;
    }

    const existing = byMessage.get(match.id);

    if (existing) {
      existing.push(member);
    } else {
      byMessage.set(match.id, [member]);
    }
  }

  // Most recent receipt first, so the "+N" hides the older ones.
  for (const list of byMessage.values()) {
    list.sort((a, b) => (parse(b.seenAt) ?? 0) - (parse(a.seenAt) ?? 0));
  }

  return byMessage;
}

/** How long to wait before the next member-row write (0 means now). */
export function receiptWriteDelay(
  lastWriteAt: number,
  now: number,
  intervalMs = RECEIPT_WRITE_INTERVAL_MS
): number {
  const elapsed = now - lastWriteAt;

  return elapsed >= intervalMs ? 0 : intervalMs - elapsed;
}

/**
 * last_read_at is always written; seen_at only when my receipts are on, so
 * turning them off stops recording what others may see.
 */
export function readReceiptPayload(receiptsOn: boolean, now: Date) {
  const iso = now.toISOString();

  return receiptsOn
    ? { last_read_at: iso, seen_at: iso }
    : { last_read_at: iso };
}

/** profiles.read_receipts defaults to true. */
export function readReceiptsOn(profile: unknown): boolean {
  if (!profile || typeof profile !== "object") {
    return true;
  }

  return (profile as { read_receipts?: boolean | null }).read_receipts !== false;
}
