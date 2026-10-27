"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { useState } from "react";
import { createPortal } from "react-dom";
import {
  loadInfoBirthdaysAction,
  loadInfoListsAction,
  loadInfoTripsAction,
  type InfoListRow,
} from "@/app/actions/info-hub";
import { createListAction } from "@/app/actions/lists";
import { updateBirthdayAction } from "@/app/actions/profile";
import {
  Avatar,
  Button,
  Chip,
  Input,
  Skeleton,
  buttonStyles,
  inputClass,
} from "@/components/ui";
import {
  LIST_KINDS,
  LIST_KIND_LABELS,
  LIST_TITLE_MAX,
  type ListKind,
} from "@/lib/lists";
import {
  daysUntilBirthday,
  formatBirthdayDate,
  isValidMonthDay,
  nextBirthday,
  untilLabel,
} from "@/lib/birthdays";
import { countdownLabel, dateKey, parseDateKey } from "@/lib/trips";
import { useInfoQuery } from "@/components/info/info-cache";
import { useToday } from "@/lib/use-today";

// The trip form is heavy (cover uploads); only the Trips tab needs it.
const CreateTripSheet = dynamic(
  () =>
    import("@/components/trips/create-trip-sheet").then(
      (m) => m.CreateTripSheet
    ),
  { ssr: false }
);

const BIRTHDAY_WINDOW_DAYS = 60;

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

// Longest possible length per month, so 29 February is always selectable.
const MONTH_DAYS = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

function RowsSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-2" aria-hidden="true">
      {Array.from({ length: rows }, (_, index) => (
        <Skeleton key={index} className="h-14 rounded-lg" />
      ))}
    </div>
  );
}

function SectionNote({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-muted">{children}</p>;
}

/* ------------------------------- Lists ---------------------------------- */

export function ListsSection() {
  const { data, loading, failed, mutate, refresh } = useInfoQuery(
    "lists",
    loadInfoListsAction
  );
  const [formOpen, setFormOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [kind, setKind] = useState<ListKind>("general");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const rows = data?.rows ?? [];
  const problem = error ?? data?.error ?? (failed ? "Couldn't load lists." : null);

  function closeForm() {
    setFormOpen(false);
    setTitle("");
    setKind("general");
    setError(null);
  }

  async function create(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (saving) {
      return;
    }

    const cleanTitle = title.trim();

    if (!cleanTitle) {
      setError("Give the list a name.");
      return;
    }

    setSaving(true);
    setError(null);
    setNotice(null);

    // Appears immediately; the row is removed again if the insert fails.
    const id = crypto.randomUUID();
    const optimistic: InfoListRow = {
      id,
      title: cleanTitle,
      kind,
      openCount: 0,
      creatorName: "you",
    };

    mutate((current) => ({
      rows: [optimistic, ...(current?.rows ?? [])],
    }));
    closeForm();

    const result = await createListAction({ id, title: cleanTitle, kind });
    setSaving(false);

    if (result.error) {
      mutate((current) => ({
        rows: (current?.rows ?? []).filter((row) => row.id !== id),
      }));
      setNotice(result.error);
      return;
    }

    setNotice(
      rows.length === 0
        ? `“${cleanTitle}” is ready. Add the first idea.`
        : "List created."
    );
    refresh();
  }

  return (
    <div className="space-y-4">
      <Button className="w-full" onClick={() => setFormOpen(true)}>
        New list
      </Button>

      {formOpen && (
        <form
          onSubmit={create}
          className="space-y-3 rounded-card border border-line bg-background p-3"
        >
          <div>
            <label
              htmlFor="info-list-title"
              className="mb-2 block text-sm text-muted"
            >
              Name
            </label>
            <Input
              id="info-list-title"
              value={title}
              maxLength={LIST_TITLE_MAX}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Taco spots"
              autoFocus
              required
            />
          </div>

          <fieldset>
            <legend className="mb-2 text-sm text-muted">Kind</legend>
            <div className="flex flex-wrap gap-2">
              {LIST_KINDS.map((option) => (
                <Chip
                  key={option}
                  selected={kind === option}
                  onClick={() => setKind(option)}
                >
                  {LIST_KIND_LABELS[option]}
                </Chip>
              ))}
            </div>
          </fieldset>

          {error && (
            <p role="alert" className="text-sm text-text">
              {error}
            </p>
          )}

          <div className="flex gap-2">
            <Button type="submit" loading={saving} disabled={saving}>
              Create list
            </Button>
            <Button variant="text" onClick={closeForm} disabled={saving}>
              Cancel
            </Button>
          </div>
        </form>
      )}

      {notice && (
        <p role="status" className="text-sm text-muted">
          {notice}
        </p>
      )}

      {loading && !data ? (
        <RowsSkeleton rows={4} />
      ) : problem ? (
        <SectionNote>{problem}</SectionNote>
      ) : rows.length === 0 ? (
        <SectionNote>No lists yet.</SectionNote>
      ) : (
        <ul className="border-t border-line">
          {rows.map((row) => (
            <li key={row.id} className="-mx-4 border-b border-line">
              <Link
                href={`/lists/${row.id}`}
                className="press-row flex min-h-14 items-center justify-between gap-3 px-4 py-3 transition-colors duration-200 ease-out hover:bg-surface-2"
              >
                <div className="min-w-0">
                  <p className="truncate text-base font-semibold text-text">
                    {row.title}
                  </p>
                  <p className="truncate text-sm text-muted">
                    {LIST_KIND_LABELS[row.kind]} · by {row.creatorName}
                  </p>
                </div>
                <span className="shrink-0 text-sm text-muted">
                  {row.openCount} open
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <Link
        href="/lists"
        className="inline-flex min-h-11 items-center text-sm font-semibold text-link"
      >
        See all lists
      </Link>
    </div>
  );
}

/* ------------------------------- Trips ---------------------------------- */

function shortDate(value: string) {
  const date = parseDateKey(value);

  if (!date) {
    return "";
  }

  return `${MONTHS[date.getMonth()].slice(0, 3)} ${date.getDate()}`;
}

function tripDates(start: string, end: string) {
  const first = shortDate(start);

  if (!first) {
    return "";
  }

  const last = shortDate(end);

  return !last || end === start ? first : `${first} – ${last}`;
}

function TripRow({
  trip,
}: {
  trip: {
    id: string;
    title: string;
    destination: string | null;
    startDate: string;
    endDate: string;
    memberInitials: { id: string; initial: string }[];
  };
}) {
  // The viewer's local day, which only exists in the browser.
  const today = useToday();
  const when = today ? countdownLabel(trip.startDate, trip.endDate, today) : null;
  const meta = [trip.destination, tripDates(trip.startDate, trip.endDate)]
    .filter(Boolean)
    .join(" · ");

  return (
    <li className="-mx-4 border-b border-line">
      <Link
        href={`/trips/${trip.id}`}
        className="press-row flex min-h-14 items-center justify-between gap-3 px-4 py-3 transition-colors duration-200 ease-out hover:bg-surface-2"
      >
        <div className="min-w-0">
          <p className="truncate text-base font-semibold text-text">
            {trip.title}
          </p>
          {meta && (
            <p className="truncate text-sm text-muted">{meta}</p>
          )}
          {when && (
            <p className="text-sm font-semibold text-link">{when}</p>
          )}
        </div>

        {trip.memberInitials.length > 0 && (
          <div className="flex shrink-0 -space-x-1.5" aria-hidden="true">
            {trip.memberInitials.slice(0, 4).map((member) => (
              <span
                key={member.id}
                className="rounded-full border-2 border-surface"
              >
                <Avatar size={24} initial={member.initial} />
              </span>
            ))}
          </div>
        )}
      </Link>
    </li>
  );
}

export function TripsSection({ userId }: { userId: string }) {
  const { data, loading, failed } = useInfoQuery("trips", loadInfoTripsAction);
  const [creating, setCreating] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const upcoming = data?.upcoming ?? [];
  const past = data?.past ?? [];
  const problem = data?.error ?? (failed ? "Couldn't load trips." : null);

  return (
    <div className="space-y-4">
      <Button className="w-full" onClick={() => setCreating(true)}>
        New trip
      </Button>

      {/* Nested over the Info sheet, so it is fixed to the viewport. */}
      {creating
        ? createPortal(
            <CreateTripSheet
              onClose={() => setCreating(false)}
              friends={data?.friends ?? []}
              userId={data?.userId ?? userId}
              onError={setNotice}
            />,
            document.body
          )
        : null}

      {notice && (
        <p role="alert" className="text-sm text-text">
          {notice}
        </p>
      )}

      {loading && !data ? (
        <RowsSkeleton rows={3} />
      ) : problem ? (
        <SectionNote>{problem}</SectionNote>
      ) : upcoming.length === 0 ? (
        <SectionNote>No trips coming up.</SectionNote>
      ) : (
        <ul className="border-t border-line">
          {upcoming.map((trip) => (
            <TripRow key={trip.id} trip={trip} />
          ))}
        </ul>
      )}

      {past.length > 0 && (
        <details className="group">
          <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between text-sm font-semibold text-muted">
            Past ({past.length})
            <ChevronDown
              size={18}
              strokeWidth={1.75}
              aria-hidden="true"
              className="transition-transform duration-200 ease-out group-open:rotate-180"
            />
          </summary>
          <ul className="border-t border-line">
            {past.map((trip) => (
              <TripRow key={trip.id} trip={trip} />
            ))}
          </ul>
        </details>
      )}

      <Link
        href="/trips"
        className="inline-flex min-h-11 items-center text-sm font-semibold text-link"
      >
        See all trips
      </Link>
    </div>
  );
}

/* ----------------------------- Birthdays -------------------------------- */

function BirthdayEditor({
  initial,
  pending,
  onSave,
  onClear,
  onCancel,
}: {
  initial: { month: number; day: number } | null;
  pending: boolean;
  onSave: (month: number, day: number) => void;
  onClear: () => void;
  onCancel: () => void;
}) {
  const [month, setMonth] = useState<number | null>(initial?.month ?? null);
  const [day, setDay] = useState<number | null>(initial?.day ?? null);
  const maxDay = month ? MONTH_DAYS[month - 1] : 31;

  return (
    <form
      className="space-y-3 border-t border-line p-4"
      onSubmit={(event) => {
        event.preventDefault();

        if (month === null || day === null) {
          return;
        }

        onSave(month, day);
      }}
    >
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label htmlFor="info-birth-month" className="mb-2 block text-sm text-muted">
            Month
          </label>
          <select
            id="info-birth-month"
            className={inputClass}
            value={month ?? ""}
            disabled={pending}
            onChange={(event) => {
              const next = event.target.value ? Number(event.target.value) : null;
              setMonth(next);

              if (next && day && day > MONTH_DAYS[next - 1]) {
                setDay(null);
              }
            }}
          >
            <option value="">Month</option>
            {MONTHS.map((name, index) => (
              <option key={name} value={index + 1}>
                {name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="info-birth-day" className="mb-2 block text-sm text-muted">
            Day
          </label>
          <select
            id="info-birth-day"
            className={inputClass}
            value={day ?? ""}
            disabled={pending}
            onChange={(event) =>
              setDay(event.target.value ? Number(event.target.value) : null)
            }
          >
            <option value="">Day</option>
            {Array.from({ length: maxDay }, (_, index) => index + 1).map(
              (value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              )
            )}
          </select>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="submit"
          size="sm"
          loading={pending}
          disabled={pending || month === null || day === null}
        >
          Save
        </Button>
        {initial && (
          <Button variant="secondary" size="sm" onClick={onClear} disabled={pending}>
            Clear
          </Button>
        )}
        <Button variant="text" size="sm" onClick={onCancel} disabled={pending}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

export function BirthdaysSection() {
  const { data, loading, failed, mutate } = useInfoQuery(
    "birthdays",
    loadInfoBirthdaysAction
  );
  const [editing, setEditing] = useState(false);
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const mine = data?.mine ?? null;
  const problem =
    data?.error ?? (failed ? "Couldn't load birthdays." : null);
  // Counting down needs the viewer's local day, which only exists in the browser.
  const today = useToday();
  const friends = today
    ? (data?.friends ?? [])
        .map((friend) => ({
          ...friend,
          days: daysUntilBirthday(friend.month, friend.day, today),
          planDate: dateKey(nextBirthday(friend.month, friend.day, today)),
        }))
        .filter((friend) => friend.days >= 0 && friend.days <= BIRTHDAY_WINDOW_DAYS)
        .sort((a, b) => a.days - b.days || a.name.localeCompare(b.name))
    : [];

  async function save(month: number | null, day: number | null) {
    if (month === null || day === null) {
      return;
    }

    if (!isValidMonthDay(month, day)) {
      setNotice("That day isn't in that month.");
      return;
    }

    setPending(true);
    setNotice(null);

    // The stored year rides along untouched; it is never shown here.
    const result = await updateBirthdayAction({ month, day, year: mine?.year ?? null });
    setPending(false);

    if (result.error) {
      setNotice(result.error);
      return;
    }

    mutate((current) => ({
      ...(current ?? { friends: [] }),
      mine: { month, day, year: mine?.year ?? null },
    }));
    setEditing(false);
    setNotice("Birthday saved.");
  }

  async function clear() {
    setPending(true);
    setNotice(null);
    const result = await updateBirthdayAction({
      month: null,
      day: null,
      year: null,
    });
    setPending(false);

    if (result.error) {
      setNotice(result.error);
      return;
    }

    mutate((current) => ({
      ...(current ?? { friends: [] }),
      mine: null,
    }));
    setEditing(false);
    setNotice("Birthday cleared.");
  }

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-card border border-line">
        <div className="flex items-center justify-between gap-3 p-4">
          <div className="min-w-0">
            <p className="text-base font-semibold text-text">My birthday</p>
            <p className="text-sm text-muted">
              {mine ? formatBirthdayDate(mine.month, mine.day) : "Not set"}
            </p>
          </div>

          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              setNotice(null);
              setEditing((current) => !current);
            }}
            disabled={pending || loading}
          >
            {mine ? "Edit" : "Set"}
          </Button>
        </div>

        {editing && (
          <BirthdayEditor
            initial={mine ? { month: mine.month, day: mine.day } : null}
            pending={pending}
            onSave={(month, day) => void save(month, day)}
            onClear={() => void clear()}
            onCancel={() => setEditing(false)}
          />
        )}
      </div>

      {notice && (
        <p role="status" className="text-sm text-muted">
          {notice}
        </p>
      )}

      <div className="space-y-2">
        <h3 className="text-base font-semibold text-text">
          Friends coming up
        </h3>
        <p className="text-sm text-muted">Next {BIRTHDAY_WINDOW_DAYS} days.</p>
      </div>

      {loading && !data ? (
        <RowsSkeleton rows={3} />
      ) : problem ? (
        <SectionNote>{problem}</SectionNote>
      ) : friends.length === 0 ? (
        <SectionNote>No birthdays coming up.</SectionNote>
      ) : (
        <ul className="border-t border-line">
          {friends.map((friend) => {
            const planTitle = `${friend.name}’s birthday`;
            const planDate = friend.planDate;

            return (
              <li
                key={friend.id}
                className="-mx-4 flex min-h-14 items-center justify-between gap-3 border-b border-line px-4 py-3"
              >
                <div className="min-w-0">
                  {friend.username ? (
                    <Link
                      href={`/u/${encodeURIComponent(friend.username)}`}
                      className="block truncate text-base font-semibold text-text transition-opacity duration-200 ease-out hover:opacity-80"
                    >
                      {friend.name}
                    </Link>
                  ) : (
                    <p className="truncate text-base font-semibold text-text">
                      {friend.name}
                    </p>
                  )}
                  <p className="text-sm text-muted">
                    {formatBirthdayDate(friend.month, friend.day)} ·{" "}
                    {untilLabel(friend.days)}
                  </p>
                </div>

                <Link
                  href={`/events/new?title=${encodeURIComponent(
                    planTitle
                  )}&date=${planDate}`}
                  className={`${buttonStyles({
                    variant: "secondary",
                    size: "sm",
                  })} shrink-0`}
                >
                  Plan something
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      <Link
        href="/birthdays"
        className="inline-flex min-h-11 items-center text-sm font-semibold text-link"
      >
        See all
      </Link>
    </div>
  );
}
