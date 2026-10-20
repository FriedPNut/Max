export const EVENT_DURATION_MS = 2 * 60 * 60 * 1000;

export function eventCalendarDates(startsAt: string) {
  const start = new Date(startsAt);
  const end = new Date(start.getTime() + EVENT_DURATION_MS);

  return { start, end };
}

/** Google Calendar expects UTC stamps like 20261019T183000Z. */
export function formatCalendarUtc(date: Date) {
  return date
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}Z$/, "Z");
}

export function eventDetails(description: string | null, eventUrl: string) {
  return [description?.trim(), eventUrl].filter(Boolean).join("\n\n");
}

export function buildGoogleCalendarUrl({
  title,
  description,
  location,
  startsAt,
  eventUrl,
}: {
  title: string;
  description: string | null;
  location: string;
  startsAt: string;
  eventUrl: string;
}) {
  const { start, end } = eventCalendarDates(startsAt);
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: title,
    dates: `${formatCalendarUtc(start)}/${formatCalendarUtc(end)}`,
    details: eventDetails(description, eventUrl),
    location,
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export function escapeIcsText(value: string) {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\r\n|\r|\n/g, "\\n")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,");
}

function foldLine(line: string) {
  const encoder = new TextEncoder();

  if (encoder.encode(line).length <= 75) {
    return line;
  }

  const parts: string[] = [];
  let current = "";
  let currentBytes = 0;

  for (const character of line) {
    const characterBytes = encoder.encode(character).length;

    if (currentBytes + characterBytes > 75) {
      if (current.length > 0) {
        parts.push(current);
      }

      current = ` ${character}`;
      currentBytes = 1 + characterBytes;
    } else {
      current += character;
      currentBytes += characterBytes;
    }
  }

  if (current.length > 0) {
    parts.push(current);
  }

  return parts.join("\r\n");
}

export function buildEventIcs({
  eventId,
  title,
  description,
  location,
  startsAt,
  eventUrl,
  now = new Date(),
}: {
  eventId: string;
  title: string;
  description: string | null;
  location: string;
  startsAt: string;
  eventUrl: string;
  now?: Date;
}) {
  const { start, end } = eventCalendarDates(startsAt);
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Max//Events//EN",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:${eventId}@max`,
    `DTSTAMP:${formatCalendarUtc(now)}`,
    `DTSTART:${formatCalendarUtc(start)}`,
    `DTEND:${formatCalendarUtc(end)}`,
    `SUMMARY:${escapeIcsText(title)}`,
    `DESCRIPTION:${escapeIcsText(eventDetails(description, eventUrl))}`,
    `LOCATION:${escapeIcsText(location)}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ];

  return `${lines.map(foldLine).join("\r\n")}\r\n`;
}
