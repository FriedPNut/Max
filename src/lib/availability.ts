export type AvailabilityRecord = {
  id: string;
  user_id: string;
  starts_at: string;
  ends_at: string;
  note: string | null;
};

export type AvailabilityWindow = AvailabilityRecord & {
  name: string;
  initial: string;
  isMine: boolean;
};

export function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function addDays(date: Date, days: number) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

// Windows that overlap a given local day [dayStart, dayEnd).
export function overlapsDay(
  window: { starts_at: string; ends_at: string },
  dayStart: Date,
  dayEnd: Date
) {
  return (
    new Date(window.starts_at).getTime() < dayEnd.getTime() &&
    new Date(window.ends_at).getTime() > dayStart.getTime()
  );
}

export function formatWindow(startIso: string, endIso: string) {
  const start = new Date(startIso);
  const end = new Date(endIso);
  const fmt = new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    hour: "numeric",
    minute: "2-digit",
  });

  return `${fmt.format(start)} – ${fmt.format(end)}`;
}
