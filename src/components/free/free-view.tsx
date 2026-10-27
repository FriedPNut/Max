"use client";

import { useEffect, useMemo, useState } from "react";
import {
  addAvailabilityAction,
  removeAvailabilityAction,
} from "@/app/actions/availability";
import { createClient } from "@/lib/supabase/client";
import {
  addDays,
  formatWindow,
  overlapsDay,
  startOfDay,
  type AvailabilityWindow,
} from "@/lib/availability";
import {
  Avatar,
  Button,
  Input,
  SegmentedControl,
} from "@/components/ui";
import { useNow } from "@/lib/use-now";

const labelClass = "block text-sm text-muted mb-2";

function quickWindows(now: Date) {
  const today = startOfDay(now);
  const sixPm = new Date(today.getTime() + 18 * 3600_000);
  const tonightStart = now.getTime() > sixPm.getTime() ? now : sixPm;
  const tomorrow = addDays(today, 1);
  const weekendStart = new Date(today);
  const daysToSaturday = (6 - today.getDay() + 7) % 7;
  weekendStart.setDate(today.getDate() + daysToSaturday);
  const weekendSunday = addDays(weekendStart, 1);

  return {
    tonight: {
      startsAt: tonightStart,
      endsAt: new Date(addDays(today, 1).getTime()),
    },
    tomorrow: {
      startsAt: new Date(tomorrow.getTime() + 9 * 3600_000),
      endsAt: new Date(tomorrow.getTime() + 23 * 3600_000),
    },
    weekend: {
      startsAt: new Date(weekendStart.getTime() + 9 * 3600_000),
      // Sunday 11 PM: one hour before Monday midnight.
      endsAt: new Date(addDays(weekendSunday, 1).getTime() - 3600_000),
    },
  };
}

export function FreeView({
  initialWindows,
  userId,
}: {
  initialWindows: AvailabilityWindow[];
  userId: string;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [windows, setWindows] = useState(initialWindows);

  useEffect(() => {
    const channel = supabase
      .channel("availability-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "availability" },
        () => {
          void supabase
            .from("availability")
            .select("id,user_id,starts_at,ends_at,note")
            .gt("ends_at", new Date().toISOString())
            .order("starts_at", { ascending: true })
            .then(({ data }) => {
              setWindows((current) => {
                const rows = (data ?? []) as AvailabilityWindow[];
                const nameById = new Map(current.map((w) => [w.user_id, { name: w.name, initial: w.initial }]));
                return rows.map((row) => {
                  const known = nameById.get(row.user_id);
                  const isMine = row.user_id === userId;
                  return {
                    ...row,
                    name: known?.name ?? (isMine ? "You" : "A friend"),
                    initial: known?.initial ?? (isMine ? "Y" : "A"),
                    isMine,
                  };
                });
              });
            });
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [supabase, userId]);
  const [error, setError] = useState<string | null>(null);
  const [date, setDate] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [note, setNote] = useState("");

  // The window is on screen before the insert; a failure takes it back.
  async function addWindow(startsAt: Date, endsAt: Date, note: string | null) {
    setError(null);

    const id = crypto.randomUUID();
    const optimistic: AvailabilityWindow = {
      id,
      user_id: userId,
      starts_at: startsAt.toISOString(),
      ends_at: endsAt.toISOString(),
      note,
      name: "You",
      initial: "Y",
      isMine: true,
    };

    setWindows((current) => [...current, optimistic]);

    const result = await addAvailabilityAction({
      id,
      startsAt: startsAt.toISOString(),
      endsAt: endsAt.toISOString(),
      note,
    });

    if (result.error) {
      setWindows((current) => current.filter((w) => w.id !== id));
      setError(result.error);
    }
  }

  async function removeWindow(id: string) {
    setError(null);
    const removed = windows.find((w) => w.id === id);

    setWindows((current) => current.filter((w) => w.id !== id));

    const result = await removeAvailabilityAction(id);

    if (result.error) {
      if (removed) {
        setWindows((current) =>
          current.some((w) => w.id === id) ? current : [...current, removed]
        );
      }

      setError(result.error);
    }
  }

  const myWindows = windows.filter((w) => w.isMine);
  const [view, setView] = useState<"today" | "week">("today");
  // A browser clock, null until mounted: the server render reads no time, and
  // "today" is the viewer's own day rather than the build machine's.
  const clock = useNow();
  const now = clock === null ? null : new Date(clock);
  const quick = now ? quickWindows(now) : null;
  const todayStart = now ? startOfDay(now) : null;
  const todayEnd = todayStart ? addDays(todayStart, 1) : null;
  const todayList =
    now && todayStart && todayEnd
      ? windows
          .filter((w) => overlapsDay(w, todayStart, todayEnd))
          .filter((w) => new Date(w.ends_at).getTime() > now.getTime())
      : [];

  const weekDays = todayStart
    ? Array.from({ length: 7 }, (_, index) => {
        const dayStart = addDays(todayStart, index);
        const dayEnd = addDays(dayStart, 1);
        const people = windows.filter((w) => overlapsDay(w, dayStart, dayEnd));
        return { dayStart, people };
      })
    : [];
  const maxCount = Math.max(0, ...weekDays.map((d) => d.people.length));

  function planForDay(dayStart: Date) {
    const key = `${dayStart.getFullYear()}-${String(dayStart.getMonth() + 1).padStart(2, "0")}-${String(dayStart.getDate()).padStart(2, "0")}`;
    window.location.href = `/events/new?date=${key}`;
  }

  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-text">Mark me as free</h2>

        <div className="flex flex-wrap gap-2">
          <Button
            variant="secondary"
            disabled={!quick}
            onClick={() =>
              quick && void addWindow(quick.tonight.startsAt, quick.tonight.endsAt, null)
            }
          >
            Tonight
          </Button>
          <Button
            variant="secondary"
            disabled={!quick}
            onClick={() =>
              quick && void addWindow(quick.tomorrow.startsAt, quick.tomorrow.endsAt, null)
            }
          >
            Tomorrow
          </Button>
          <Button
            variant="secondary"
            disabled={!quick}
            onClick={() =>
              quick && void addWindow(quick.weekend.startsAt, quick.weekend.endsAt, null)
            }
          >
            This weekend
          </Button>
        </div>

        {error && (
          <p role="alert" className="text-sm text-text">
            {error}
          </p>
        )}

        <div className="space-y-3">
          <p className="text-sm text-muted">Pick a time</p>
          <div>
            <label htmlFor="free-date" className={labelClass}>Date</label>
            <Input id="free-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label htmlFor="free-start" className={labelClass}>Start</label>
              <Input id="free-start" type="time" value={start} onChange={(e) => setStart(e.target.value)} />
            </div>
            <div>
              <label htmlFor="free-end" className={labelClass}>End</label>
              <Input id="free-end" type="time" value={end} onChange={(e) => setEnd(e.target.value)} />
            </div>
          </div>
          <div>
            <label htmlFor="free-note" className={labelClass}>Note (optional)</label>
            <Input id="free-note" type="text" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Free after work" />
          </div>
          <Button
            disabled={!date || !start || !end}
            onClick={() => {
              const startsAt = new Date(`${date}T${start}`);
              const endsAt = new Date(`${date}T${end}`);
              void addWindow(startsAt, endsAt, note.trim() || null);
              setNote("");
            }}
          >
            Add time
          </Button>
        </div>
      </section>

      <section className="space-y-4">
        <SegmentedControl
          label="Free view"
          value={view}
          onChange={setView}
          options={[
            { value: "today", label: "Today" },
            { value: "week", label: "This week" },
          ]}
          className="inline-flex"
        />

        {windows.length === 0 ? (
          <p className="text-sm text-muted">Nobody has marked themselves free yet.</p>
        ) : view === "today" ? (
          todayList.length === 0 ? (
            <p className="text-sm text-muted">Nobody is free today.</p>
          ) : (
            <ul className="border-t border-line">
              {todayList.map((w) => (
                <li key={w.id} className="-mx-4 flex items-start gap-3 border-b border-line px-4 py-3">
                  <Avatar initial={w.initial} name={w.name} size={40} />
                  <div className="min-w-0">
                    <p className="text-base font-semibold text-text">{w.name}</p>
                    <p className="text-sm text-muted">{formatWindow(w.starts_at, w.ends_at)}</p>
                    {w.note && <p className="text-sm text-muted">{w.note}</p>}
                  </div>
                </li>
              ))}
            </ul>
          )
        ) : (
          <div className="space-y-6">
            {weekDays.map(({ dayStart, people }, index) => {
              const isBest = maxCount > 0 && people.length === maxCount;
              return (
                <div key={index} className="space-y-2">
                  <div className="flex items-baseline justify-between gap-3">
                    <h3 className="text-base font-semibold text-text">
                      {dayStart.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" })}
                    </h3>
                    <p className="text-sm text-muted">
                      {people.length} {people.length === 1 ? "person" : "people"}
                      {isBest && " · Best day"}
                    </p>
                  </div>
                  {people.length > 0 && (
                    <ul className="border-t border-line">
                      {people.map((w) => (
                        <li key={w.id} className="-mx-4 flex items-start gap-3 border-b border-line px-4 py-2">
                          <span className="text-base text-text">{w.name}</span>
                          <span className="text-sm text-muted">{formatWindow(w.starts_at, w.ends_at)}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                  <Button variant="text" size="sm" onClick={() => planForDay(dayStart)}>
                    Make a plan
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-text">My times</h2>
        {myWindows.length === 0 ? (
          <p className="text-sm text-muted">Nothing marked yet.</p>
        ) : (
          <ul className="border-t border-line">
            {myWindows.map((w) => (
              <li key={w.id} className="-mx-4 flex min-h-14 items-center justify-between gap-3 border-b border-line px-4 py-3">
                <div className="min-w-0">
                  <p className="text-base text-text">{formatWindow(w.starts_at, w.ends_at)}</p>
                  {w.note && <p className="text-sm text-muted">{w.note}</p>}
                </div>
                <Button variant="destructive" size="sm" onClick={() => void removeWindow(w.id)}>
                  Remove
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
