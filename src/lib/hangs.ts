export const HANG_MESSAGE_MAX = 140;

export type HangResponse = "in" | "later" | "out";

export type HangRecord = {
  id: string;
  created_by: string;
  message: string;
  location: string | null;
  expires_at: string;
  created_at: string;
};

export type HangResponseRecord = {
  hang_id: string;
  user_id: string;
  response: HangResponse;
};

export type HangDuration = "1h" | "3h" | "midnight";

export function expiresAtFor(duration: HangDuration, now: Date) {
  if (duration === "1h") {
    return new Date(now.getTime() + 60 * 60 * 1000);
  }

  if (duration === "3h") {
    return new Date(now.getTime() + 3 * 60 * 60 * 1000);
  }

  return new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
}

export function isHangDuration(value: string): value is HangDuration {
  return value === "1h" || value === "3h" || value === "midnight";
}

export function timeLeftLabel(expiresAt: string, now: number) {
  const minutes = Math.max(
    0,
    Math.round((new Date(expiresAt).getTime() - now) / 60000)
  );

  if (minutes < 60) {
    return `${minutes} min left`;
  }

  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;

  return rest === 0 ? `${hours} h left` : `${hours} h ${rest} min left`;
}
