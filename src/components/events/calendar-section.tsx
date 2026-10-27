"use client";

import { FastLink } from "@/components/ui/fast-link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { LocalTime } from "@/components/local-time";
import { Button, SegmentedControl, Skeleton } from "@/components/ui";
import { useHydrated } from "@/lib/use-hydrated";
import { useToday } from "@/lib/use-today";
import { useNow } from "@/lib/use-now";
import {
  WEEKDAY_LABELS,
  addDaysToKey,
  addMonthsToKey,
  dateKeyFromDate,
  eventDateKey,
  formatDayLong,
  formatDayTitle,
  formatMonthTitle,
  formatWeekTitle,
  monthGridKeys,
  startOfWeekKey,
  type CalendarView,
} from "@/lib/calendar";
import type { EventListItem } from "@/lib/events";

const VIEW_STORAGE_KEY = "max.events.calendar.view";

const VIEWS: { id: CalendarView; label: string }[] = [
  { id: "week", label: "Week" },
  { id: "month", label: "Month" },
];

function CalendarEventRow({
  event,
  now,
}: {
  event: EventListItem;
  /** Browser clock, null until mounted, so the server render reads no time. */
  now: number | null;
}) {
  const isPast = now !== null && new Date(event.starts_at).getTime() < now;

  return (
    <FastLink
      href={`/events/${event.id}`}
      className="press-row -mx-4 flex min-h-14 items-center gap-3 border-b border-line px-4 py-3 transition-colors duration-200 ease-out last:border-b-0 hover:bg-surface-2"
    >
      <span className="w-16 shrink-0 text-sm text-muted">
        <LocalTime iso={event.starts_at} format="time" />
      </span>

      <span className="min-w-0 flex-1">
        <span
          className={`block text-base font-semibold break-words ${
            isPast ? "text-muted" : "text-text"
          }`}
        >
          {event.title}
        </span>
        <span className="mt-0.5 block text-sm text-muted">
          {event.goingCount} going
        </span>
      </span>
    </FastLink>
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
        className="grid grid-cols-2 gap-1 rounded-full bg-surface-2 p-1"
      >
        {[0, 1].map((index) => (
          <Skeleton key={index} className="h-11 rounded-lg" />
        ))}
      </div>

      <div aria-hidden="true" className="flex flex-wrap items-center gap-2">
        <Skeleton className="h-6 min-w-0 flex-1 rounded" />
        <div className="flex shrink-0 items-center gap-1">
          <Skeleton className="h-11 w-11 rounded-lg" />
          <Skeleton className="h-11 w-11 rounded-lg" />
          <Skeleton className="h-11 w-16 rounded-lg" />
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
            <Skeleton key={index} className="h-11 rounded-lg" />
          ))}
        </div>
      </div>
    </section>
  );
}

export function CalendarSection({ events }: { events: EventListItem[] }) {
  const hydrated = useHydrated();
  const localToday = useToday();
  const now = useNow();
  const [view, setView] = useState<CalendarView>("month");
  const [cursorKey, setCursorKey] = useState<string | null>(null);
  const initialized = useRef(false);
  const selectedRef = useRef<string | null>(null);
  const previousTodayRef = useRef<string | null>(null);

  const today = localToday ? dateKeyFromDate(localToday) : null;

  const selectKey = useCallback((key: string) => {
    selectedRef.current = key;
    setCursorKey(key);
  }, []);

  useEffect(() => {
    if (!hydrated || initialized.current || !localToday) {
      return;
    }

    initialized.current = true;
    selectKey(dateKeyFromDate(localToday));

    try {
      const stored = window.localStorage.getItem(VIEW_STORAGE_KEY);

      if (stored === "week" || stored === "month") {
        setView(stored);
      } else if (stored) {
        // Retired views such as "day" fall back to Month and are rewritten.
        setView("month");
        window.localStorage.setItem(VIEW_STORAGE_KEY, "month");
      }
    } catch {
      // Remembering the view is a convenience; ignore blocked storage.
    }
  }, [hydrated, localToday, selectKey]);

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

  if (!hydrated || !localToday || !cursorKey || !today) {
    return <CalendarSkeleton />;
  }

  const currentYear = localToday.getFullYear();
  const selectedKey = cursorKey;
  const currentToday = today;
  const isOnToday = selectedKey === currentToday;
  const title =
    view === "month"
      ? formatMonthTitle(selectedKey)
      : formatWeekTitle(selectedKey);

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
        : addDaysToKey(selectedKey, delta * 7);

    selectKey(next);
  }

  function goToday() {
    selectKey(currentToday);
  }

  return (
    <section className="space-y-4" data-no-swipe>
      <SegmentedControl
        label="Calendar view"
        value={view}
        onChange={changeView}
        options={VIEWS.map((item) => ({ value: item.id, label: item.label }))}
      />

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-2 gap-y-1">
          <h2 className="text-lg font-semibold text-text break-words">
            {title}
          </h2>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={() => move(-1)}
            aria-label={`Previous ${view}`}
            className="inline-flex h-11 w-11 items-center justify-center rounded-lg text-muted transition-colors duration-200 ease-out hover:bg-surface-2 hover:text-text"
          >
            <ChevronLeft size={24} strokeWidth={1.75} aria-hidden="true" />
          </button>

          <button
            type="button"
            onClick={() => move(1)}
            aria-label={`Next ${view}`}
            className="inline-flex h-11 w-11 items-center justify-center rounded-lg text-muted transition-colors duration-200 ease-out hover:bg-surface-2 hover:text-text"
          >
            <ChevronRight size={24} strokeWidth={1.75} aria-hidden="true" />
          </button>

          <Button
            variant="secondary"
            size="sm"
            onClick={goToday}
            className={isOnToday ? "text-muted" : ""}
          >
            Today
          </Button>
        </div>
      </div>

      {view === "month" && (
        <MonthView
          cursorKey={selectedKey}
          eventsByDay={eventsByDay}
          today={currentToday}
          now={now}
          onSelectDay={selectKey}
        />
      )}

      {view === "week" && (
        <WeekView
          cursorKey={selectedKey}
          eventsByDay={eventsByDay}
          today={currentToday}
          currentYear={currentYear}
          now={now}
        />
      )}
    </section>
  );
}

function MonthView({
  cursorKey,
  eventsByDay,
  today,
  now,
  onSelectDay,
}: {
  cursorKey: string;
  eventsByDay: Map<string, EventListItem[]>;
  today: string;
  /** Browser clock, null until mounted. */
  now: number | null;
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
                className="group relative flex min-h-11 flex-col items-center justify-center rounded-[10px] text-sm text-text cursor-pointer transition-[opacity,transform] duration-100 ease-out active:scale-[0.97] active:opacity-90"
              >
                <span
                  className={`relative flex h-11 w-10 flex-col items-center justify-center rounded-[10px] group-focus-visible:outline-2 group-focus-visible:outline-offset-2 group-focus-visible:outline-primary ${
                    isSelected ? "day-box-selected bg-surface-2" : ""
                  }`}
                >
                  <span
                    className={`leading-none ${isToday ? "text-today" : "text-text"} ${
                      isSelected || (isToday && !isSelected) ? "font-semibold" : ""
                    } ${isSelected ? "font-bold" : ""}`}
                  >
                    {Number(key.slice(-2))}
                  </span>

                  {hasEvents && (
                    <span
                      aria-hidden="true"
                      className="mt-1 h-1 w-1 rounded-full bg-primary"
                    />
                  )}
                </span>
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
                <CalendarEventRow key={event.id} event={event} now={now} />
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
  now,
}: {
  cursorKey: string;
  eventsByDay: Map<string, EventListItem[]>;
  today: string;
  currentYear: number;
  /** Browser clock, null until mounted. */
  now: number | null;
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
                  isToday ? "text-today" : "text-text"
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
                  <CalendarEventRow key={event.id} event={event} now={now} />
                ))}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
