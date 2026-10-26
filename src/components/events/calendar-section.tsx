"use client";

import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { LocalTime } from "@/components/local-time";
import { useHydrated } from "@/lib/use-hydrated";
import {
  WEEKDAY_LABELS,
  addDaysToKey,
  addMonthsToKey,
  dateKeyFromDate,
  eventDateKey,
  eventMinutes,
  formatDayLong,
  formatDayTitle,
  formatHourLabel,
  formatMonthTitle,
  formatWeekTitle,
  monthGridKeys,
  startOfWeekKey,
  type CalendarView,
} from "@/lib/calendar";
import type { EventListItem } from "@/lib/events";

const VIEW_STORAGE_KEY = "max.events.calendar.view";
const HOUR_HEIGHT = 56;
const START_HOUR = 6;
const END_HOUR = 24;
const TOTAL_HOURS = END_HOUR - START_HOUR;

const VIEWS: { id: CalendarView; label: string }[] = [
  { id: "day", label: "Day" },
  { id: "week", label: "Week" },
  { id: "month", label: "Month" },
];

type PositionedEvent = {
  event: EventListItem;
  start: number;
  end: number;
  lane: number;
  lanes: number;
};

function layoutTimelineEvents(
  items: { event: EventListItem; start: number }[]
): PositionedEvent[] {
  const sorted = [...items].sort((a, b) => a.start - b.start);
  const result: PositionedEvent[] = [];
  let cluster: PositionedEvent[] = [];
  let clusterEnd = -1;

  function flush() {
    const laneEnds: number[] = [];

    for (const item of cluster) {
      let lane = laneEnds.findIndex((end) => end <= item.start);

      if (lane === -1) {
        lane = laneEnds.length;
        laneEnds.push(item.end);
      } else {
        laneEnds[lane] = item.end;
      }

      item.lane = lane;
    }

    const lanes = Math.max(1, laneEnds.length);

    for (const item of cluster) {
      item.lanes = lanes;
    }

    result.push(...cluster);
    cluster = [];
    clusterEnd = -1;
  }

  for (const item of sorted) {
    if (cluster.length > 0 && item.start >= clusterEnd) {
      flush();
    }

    const positioned: PositionedEvent = {
      ...item,
      end: item.start + 60,
      lane: 0,
      lanes: 1,
    };

    cluster.push(positioned);
    clusterEnd = Math.max(clusterEnd, positioned.end);
  }

  if (cluster.length > 0) {
    flush();
  }

  return result;
}

function CalendarEventRow({ event }: { event: EventListItem }) {
  const isPast = new Date(event.starts_at).getTime() < Date.now();

  return (
    <Link
      href={`/events/${event.id}`}
      className="flex items-baseline gap-3 rounded-lg py-1.5 transition-colors duration-150 ease-out hover:bg-surface"
    >
      <span className="w-16 shrink-0 text-sm text-muted">
        <LocalTime iso={event.starts_at} format="time" />
      </span>

      <span className="min-w-0 flex-1">
        <span
          className={`block text-base font-medium break-words ${
            isPast ? "text-muted" : "text-text"
          }`}
        >
          {event.title}
        </span>
        <span className="mt-0.5 block text-sm text-muted">
          {event.goingCount} going
        </span>
      </span>
    </Link>
  );
}

function CalendarSkeleton() {
  return (
    <section
      className="space-y-4"
      aria-busy="true"
      aria-label="Loading calendar"
    >
      <div
        aria-hidden="true"
        className="grid grid-cols-3 gap-1 rounded-lg border border-border bg-surface p-1"
      >
        {[0, 1, 2].map((index) => (
          <div key={index} className="h-11 rounded-lg bg-line/50" />
        ))}
      </div>

      <div aria-hidden="true" className="flex flex-wrap items-center gap-2">
        <div className="h-6 min-w-0 flex-1 rounded bg-line/50" />
        <div className="flex shrink-0 items-center gap-1">
          <div className="h-11 w-11 rounded-lg bg-line/40" />
          <div className="h-11 w-11 rounded-lg bg-line/40" />
          <div className="h-11 w-16 rounded-lg bg-line/40" />
        </div>
      </div>

      <div aria-hidden="true" className="space-y-1">
        <div className="grid grid-cols-7 gap-1">
          {WEEKDAY_LABELS.map((label) => (
            <div key={label} className="h-6" />
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: 42 }, (_, index) => (
            <div key={index} className="h-11 rounded-lg bg-line/30" />
          ))}
        </div>
      </div>
    </section>
  );
}

export function CalendarSection({ events }: { events: EventListItem[] }) {
  const hydrated = useHydrated();
  const [now, setNow] = useState<Date | null>(null);
  const [view, setView] = useState<CalendarView>("month");
  const [cursorKey, setCursorKey] = useState<string | null>(null);
  const [scrollSignal, setScrollSignal] = useState(0);
  const initialized = useRef(false);
  const selectedRef = useRef<string | null>(null);
  const previousTodayRef = useRef<string | null>(null);

  const today = now ? dateKeyFromDate(now) : null;

  const selectKey = useCallback((key: string) => {
    selectedRef.current = key;
    setCursorKey(key);
  }, []);

  useEffect(() => {
    if (!hydrated || initialized.current) {
      return;
    }

    initialized.current = true;
    const current = new Date();
    const key = dateKeyFromDate(current);

    setNow(current);
    selectKey(key);

    try {
      const stored = window.localStorage.getItem(VIEW_STORAGE_KEY);

      if (stored === "day" || stored === "week" || stored === "month") {
        setView(stored);
      }
    } catch {
      // Remembering the view is a convenience; ignore blocked storage.
    }
  }, [hydrated, selectKey]);

  useEffect(() => {
    if (!hydrated) {
      return;
    }

    let timer = 0;

    function scheduleNextMinute() {
      const current = new Date();
      const delay =
        60_000 - (current.getSeconds() * 1_000 + current.getMilliseconds());

      timer = window.setTimeout(() => {
        setNow(new Date());
        scheduleNextMinute();
      }, delay + 50);
    }

    scheduleNextMinute();

    return () => window.clearTimeout(timer);
  }, [hydrated]);

  useEffect(() => {
    if (!hydrated || !today) {
      return;
    }

    let timer = 0;

    function scheduleMidnight() {
      const current = new Date();
      const nextMidnight = new Date(
        current.getFullYear(),
        current.getMonth(),
        current.getDate() + 1,
        0,
        0,
        0,
        200
      );
      const delay = Math.max(1_000, nextMidnight.getTime() - current.getTime());

      timer = window.setTimeout(() => {
        const fresh = new Date();
        setNow(fresh);

        if (dateKeyFromDate(fresh) === today) {
          scheduleMidnight();
        }
      }, delay);
    }

    scheduleMidnight();

    return () => window.clearTimeout(timer);
  }, [hydrated, today]);

  useEffect(() => {
    if (!today) {
      return;
    }

    const previous = previousTodayRef.current;

    if (previous && previous !== today && selectedRef.current === previous) {
      selectKey(today);
    }

    previousTodayRef.current = today;
  }, [today, selectKey]);

  useEffect(() => {
    if (!hydrated) {
      return;
    }

    function resetToToday() {
      const current = new Date();
      const key = dateKeyFromDate(current);

      setNow(current);
      selectKey(key);
      setScrollSignal((value) => value + 1);
    }

    function handleVisibilityChange() {
      if (document.visibilityState === "visible") {
        resetToToday();
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () =>
      document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [hydrated, selectKey]);

  const eventsByDay = useMemo(() => {
    const map = new Map<string, EventListItem[]>();

    if (!hydrated) {
      return map;
    }

    for (const event of events) {
      if (event.poll_open) {
        continue;
      }

      const key = eventDateKey(event.starts_at);

      if (!key) {
        continue;
      }

      const dayEvents = map.get(key);

      if (dayEvents) {
        dayEvents.push(event);
      } else {
        map.set(key, [event]);
      }
    }

    for (const dayEvents of map.values()) {
      dayEvents.sort(
        (a, b) =>
          new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime()
      );
    }

    return map;
  }, [events, hydrated]);

  if (!hydrated || !now || !cursorKey || !today) {
    return <CalendarSkeleton />;
  }

  const currentYear = now.getFullYear();
  const selectedKey = cursorKey;
  const currentToday = today;
  const isOnToday = selectedKey === currentToday;
  const title =
    view === "month"
      ? formatMonthTitle(selectedKey)
      : view === "week"
      ? formatWeekTitle(selectedKey)
      : formatDayTitle(selectedKey, currentYear);

  function changeView(next: CalendarView) {
    setView(next);

    try {
      window.localStorage.setItem(VIEW_STORAGE_KEY, next);
    } catch {
      // Remembering the view is a convenience; ignore blocked storage.
    }
  }

  function move(delta: number) {
    const next =
      view === "month"
        ? addMonthsToKey(selectedKey, delta)
        : view === "week"
        ? addDaysToKey(selectedKey, delta * 7)
        : addDaysToKey(selectedKey, delta);

    selectKey(next);
  }

  function goToday() {
    selectKey(currentToday);

    if (view === "day") {
      setScrollSignal((value) => value + 1);
    }
  }

  return (
    <section className="space-y-4">
      <div
        role="group"
        aria-label="Calendar view"
        className="grid grid-cols-3 gap-1 rounded-lg border border-border bg-surface p-1"
      >
        {VIEWS.map((item) => {
          const isActive = view === item.id;

          return (
            <button
              key={item.id}
              type="button"
              aria-pressed={isActive}
              onClick={() => changeView(item.id)}
              className={`min-h-11 rounded-lg px-3 text-sm transition-colors duration-150 ease-out cursor-pointer ${
                isActive
                  ? "bg-text text-background font-medium"
                  : "text-muted hover:text-text"
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-2 gap-y-1">
          <h2 className="text-lg font-semibold text-text break-words">
            {title}
          </h2>

          {view === "day" && isOnToday && (
            <span className="shrink-0 text-sm font-medium text-accent">
              Today
            </span>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={() => move(-1)}
            aria-label={`Previous ${view}`}
            className="inline-flex h-11 w-11 items-center justify-center rounded-lg text-muted transition-colors duration-150 ease-out hover:bg-surface hover:text-text cursor-pointer"
          >
            <ChevronLeft size={20} strokeWidth={1.5} aria-hidden="true" />
          </button>

          <button
            type="button"
            onClick={() => move(1)}
            aria-label={`Next ${view}`}
            className="inline-flex h-11 w-11 items-center justify-center rounded-lg text-muted transition-colors duration-150 ease-out hover:bg-surface hover:text-text cursor-pointer"
          >
            <ChevronRight size={20} strokeWidth={1.5} aria-hidden="true" />
          </button>

          <button
            type="button"
            onClick={goToday}
            className={`min-h-11 rounded-lg border bg-transparent px-3 text-sm font-medium transition-colors duration-150 ease-out cursor-pointer ${
              isOnToday
                ? "border-border text-muted"
                : "border-border text-text hover:bg-surface"
            }`}
          >
            Today
          </button>
        </div>
      </div>

      {view === "month" && (
        <MonthView
          cursorKey={selectedKey}
          eventsByDay={eventsByDay}
          today={currentToday}
          onSelectDay={selectKey}
        />
      )}

      {view === "week" && (
        <WeekView
          cursorKey={selectedKey}
          eventsByDay={eventsByDay}
          today={currentToday}
          currentYear={currentYear}
        />
      )}

      {view === "day" && (
        <DayView
          dayKey={selectedKey}
          eventsByDay={eventsByDay}
          today={currentToday}
          now={now}
          scrollSignal={scrollSignal}
        />
      )}
    </section>
  );
}

function MonthView({
  cursorKey,
  eventsByDay,
  today,
  onSelectDay,
}: {
  cursorKey: string;
  eventsByDay: Map<string, EventListItem[]>;
  today: string;
  onSelectDay: (key: string) => void;
}) {
  const cells = monthGridKeys(cursorKey);
  const selectedEvents = eventsByDay.get(cursorKey) ?? [];

  return (
    <div className="space-y-4">
      <div>
        <div className="grid grid-cols-7">
          {WEEKDAY_LABELS.map((label) => (
            <div
              key={label}
              className="py-1 text-center text-sm text-muted"
            >
              {label}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7">
          {cells.map((key, index) => {
            if (!key) {
              return <div key={`blank-${index}`} aria-hidden="true" />;
            }

            const isSelected = cursorKey === key;
            const isToday = today === key;
            const hasEvents = (eventsByDay.get(key)?.length ?? 0) > 0;

            return (
              <button
                key={key}
                type="button"
                onClick={() => onSelectDay(key)}
                aria-pressed={isSelected}
                aria-current={isToday ? "date" : undefined}
                aria-label={formatDayLong(key)}
                className={`relative flex min-h-11 flex-col items-center justify-center rounded-lg text-sm transition-colors duration-150 ease-out cursor-pointer ${
                  isSelected
                    ? "bg-text font-medium text-background"
                    : "text-text hover:bg-surface"
                }`}
              >
                <span
                  className={`flex h-7 w-7 items-center justify-center rounded-full ${
                    isToday ? "bg-text font-medium text-background" : ""
                  }`}
                >
                  {Number(key.slice(-2))}
                </span>

                {hasEvents && (
                  <span
                    aria-hidden="true"
                    className={`absolute bottom-1 h-1 w-1 rounded-full ${
                      isSelected ? "bg-background" : "bg-accent"
                    }`}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="border-t border-line pt-4" aria-live="polite">
        <div className="space-y-2">
          <h3 className="text-lg font-semibold text-text">
            {formatDayLong(cursorKey)}
          </h3>

          {selectedEvents.length === 0 ? (
            <p className="text-sm text-muted">Nothing planned.</p>
          ) : (
            <div>
              {selectedEvents.map((event) => (
                <CalendarEventRow key={event.id} event={event} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function WeekView({
  cursorKey,
  eventsByDay,
  today,
  currentYear,
}: {
  cursorKey: string;
  eventsByDay: Map<string, EventListItem[]>;
  today: string;
  currentYear: number;
}) {
  const start = startOfWeekKey(cursorKey);
  const days = Array.from({ length: 7 }, (_, index) =>
    addDaysToKey(start, index)
  );

  return (
    <div className="border-t border-line">
      {days.map((day) => {
        const dayEvents = eventsByDay.get(day) ?? [];
        const isToday = day === today;

        return (
          <section key={day} className="border-b border-line py-4">
            <div className="flex items-baseline justify-between gap-3">
              <h3
                className={`text-lg font-semibold ${
                  isToday ? "text-accent" : "text-text"
                }`}
              >
                {formatDayTitle(day, currentYear)}
              </h3>

              {isToday && (
                <span className="text-sm text-muted">Today</span>
              )}
            </div>

            {dayEvents.length === 0 ? (
              <p className="mt-1 text-sm text-muted">Nothing planned</p>
            ) : (
              <div className="mt-1">
                {dayEvents.map((event) => (
                  <CalendarEventRow key={event.id} event={event} />
                ))}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}

function DayView({
  dayKey,
  eventsByDay,
  today,
  now,
  scrollSignal,
}: {
  dayKey: string;
  eventsByDay: Map<string, EventListItem[]>;
  today: string;
  now: Date;
  scrollSignal: number;
}) {
  const lineRef = useRef<HTMLDivElement | null>(null);
  const dayEvents = eventsByDay.get(dayKey) ?? [];
  const earlyEvents: EventListItem[] = [];
  const timelineInput: { event: EventListItem; start: number }[] = [];

  for (const event of dayEvents) {
    const start = eventMinutes(event.starts_at);

    if (start === null) {
      continue;
    }

    if (start < START_HOUR * 60) {
      earlyEvents.push(event);
    } else if (start < END_HOUR * 60) {
      timelineInput.push({ event, start });
    }
  }

  const positioned = layoutTimelineEvents(timelineInput);
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const currentTop =
    dayKey === today
      ? ((nowMinutes - START_HOUR * 60) / 60) * HOUR_HEIGHT + 2
      : null;
  const showCurrentLine =
    currentTop !== null &&
    currentTop >= 0 &&
    currentTop <= TOTAL_HOURS * HOUR_HEIGHT;

  useEffect(() => {
    if (dayKey !== today || !lineRef.current) {
      return;
    }

    const scroller = lineRef.current.closest("main");
    const scrollerTop = scroller?.getBoundingClientRect().top ?? 0;
    // The page scrolls inside `main`, so measure against its content box.
    const lineTop = scroller
      ? lineRef.current.getBoundingClientRect().top -
        scrollerTop +
        scroller.scrollTop
      : lineRef.current.getBoundingClientRect().top + window.scrollY;
    const targetViewportY =
      (scroller?.clientHeight ?? window.innerHeight) / 2 - HOUR_HEIGHT;
    const top = Math.max(0, lineTop - Math.max(0, targetViewportY));

    if (scroller) {
      scroller.scrollTo({ top, behavior: "auto" });
    } else {
      window.scrollTo({ top, behavior: "auto" });
    }
  }, [dayKey, today, scrollSignal]);

  if (dayEvents.length === 0) {
    return (
      <p className="border-t border-line pt-4 text-sm text-muted">
        Nothing planned.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {earlyEvents.length > 0 && (
        <div className="border-t border-line pt-3">
          <p className="text-sm text-muted">Before 6 AM</p>
          <div className="mt-1">
            {earlyEvents.map((event) => (
              <CalendarEventRow key={event.id} event={event} />
            ))}
          </div>
        </div>
      )}

      {timelineInput.length > 0 && (
        <div
          className="relative border-b border-line"
          style={{ height: TOTAL_HOURS * HOUR_HEIGHT }}
        >
          {Array.from({ length: TOTAL_HOURS }, (_, index) => {
            const hour = START_HOUR + index;

            return (
              <div key={hour} className="flex h-14 items-start">
                <span className="w-14 shrink-0 text-sm text-muted">
                  {formatHourLabel(hour)}
                </span>
                <span
                  aria-hidden="true"
                  className="mt-2 h-px flex-1 bg-line"
                />
              </div>
            );
          })}

          <div className="absolute inset-y-0 left-14 right-0">
            {positioned.map((item) => {
              const top =
                ((item.start - START_HOUR * 60) / 60) * HOUR_HEIGHT + 2;
              const width = 100 / item.lanes;
              const left = (item.lane * width).toFixed(4);

              return (
                <Link
                  key={item.event.id}
                  href={`/events/${item.event.id}`}
                  className="absolute overflow-hidden rounded-lg border border-border bg-surface px-2.5 py-1.5 transition-colors duration-150 ease-out hover:bg-background"
                  style={{
                    top,
                    height: HOUR_HEIGHT,
                    left: `calc(${left}% + 2px)`,
                    width: `calc(${width.toFixed(4)}% - 4px)`,
                  }}
                >
                  <p className="truncate text-sm font-medium text-text">
                    {item.event.title}
                  </p>
                  <p className="mt-1 truncate text-sm text-muted">
                    <LocalTime iso={item.event.starts_at} format="time" />
                    {" · "}
                    {item.event.goingCount} going
                  </p>
                </Link>
              );
            })}

            {showCurrentLine && currentTop !== null && (
              <div
                ref={lineRef}
                aria-hidden="true"
                className="absolute left-0 right-0 z-10 h-px bg-accent"
                style={{ top: currentTop }}
              >
                <span className="absolute -left-1 -top-1 h-2 w-2 rounded-full bg-accent" />
              </div>
            )}
          </div>
        </div>
      )}

      {showCurrentLine && timelineInput.length > 0 && (
        <div
          aria-hidden="true"
          style={{ height: "calc(50vh + 56px)" }}
        />
      )}
    </div>
  );
}
