export const ARRIVAL_ETA_OPTIONS = [5, 10, 15, 30, 45] as const;
export type ArrivalEta = (typeof ARRIVAL_ETA_OPTIONS)[number];
export type ArrivalStatus = "on_my_way" | "here";

export type ArrivalRecord = {
  event_id: string;
  user_id: string;
  status: ArrivalStatus;
  eta_minutes: number | null;
  updated_at: string;
};

const HOUR_MS = 60 * 60 * 1000;
export const ARRIVAL_WINDOW_BEFORE_MS = 2 * HOUR_MS;
export const ARRIVAL_WINDOW_AFTER_MS = 3 * HOUR_MS;
export const ARRIVAL_STALE_MS = 12 * HOUR_MS;

// Arrivals show from 2 hours before the start until 3 hours after.
export function isArrivalWindowOpen(startsAt: string, now = Date.now()) {
  const start = new Date(startsAt).getTime();
  return now >= start - ARRIVAL_WINDOW_BEFORE_MS && now <= start + ARRIVAL_WINDOW_AFTER_MS;
}

// Rows older than 12 hours are ignored.
export function isArrivalFresh(updatedAt: string, now = Date.now()) {
  return now - new Date(updatedAt).getTime() <= ARRIVAL_STALE_MS;
}

// "about 10 min" while the ETA is ahead; "any minute" once it has passed.
export function arrivalEtaLabel(row: ArrivalRecord, now = Date.now()) {
  if (row.status !== "on_my_way" || row.eta_minutes == null) {
    return null;
  }

  const arrivesAt = new Date(row.updated_at).getTime() + row.eta_minutes * 60 * 1000;
  const remaining = Math.ceil((arrivesAt - now) / 60000);

  return remaining <= 0 ? "any minute" : `about ${remaining} min`;
}
