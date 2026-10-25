"use client";

import { useState } from "react";
import {
  createEventRideAction,
  updateEventRideAction,
} from "@/app/actions/event-plan";
import {
  RIDE_SEATS_MAX,
  RIDE_SEATS_MIN,
  type EventPlanSnapshot,
  type EventRide,
} from "@/lib/event-plan";

const fieldClass =
  "w-full bg-surface text-text placeholder:text-muted border border-border rounded-lg px-3 py-3 text-base leading-snug focus:outline-2 focus:outline-offset-0 focus:outline-text [color-scheme:light]";

const labelClass = "block text-sm text-muted mb-2";

const primaryButton =
  "inline-flex min-h-11 items-center justify-center rounded-lg bg-text px-4 py-3 text-sm font-medium text-background transition-opacity duration-150 ease-out hover:opacity-90 cursor-pointer disabled:opacity-60 disabled:pointer-events-none";

const secondaryButton =
  "inline-flex min-h-11 items-center justify-center rounded-lg border border-border bg-transparent px-4 py-3 text-sm font-medium text-text transition-colors duration-150 ease-out hover:bg-background cursor-pointer disabled:opacity-60 disabled:pointer-events-none";

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function toLocalDateTimeValue(iso: string | null) {
  if (!iso) {
    return "";
  }

  const date = new Date(iso);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate()
  )}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function RideForm({
  eventId,
  mode,
  ride,
  onCancel,
  onSaved,
}: {
  eventId: string;
  mode: "create" | "edit";
  ride?: EventRide;
  onCancel: () => void;
  onSaved: (snapshot: EventPlanSnapshot) => void;
}) {
  const isEditing = mode === "edit";
  const minimumSeats = ride
    ? Math.max(RIDE_SEATS_MIN, ride.passengers.length)
    : RIDE_SEATS_MIN;
  const initialSeats = ride
    ? Math.min(RIDE_SEATS_MAX, Math.max(ride.seats, minimumSeats))
    : 3;
  const [seats, setSeats] = useState(String(initialSeats));
  const [departingFrom, setDepartingFrom] = useState(
    ride?.departingFrom ?? ""
  );
  const [departAt, setDepartAt] = useState(
    toLocalDateTimeValue(ride?.departAt ?? null)
  );
  const [notes, setNotes] = useState(ride?.notes ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const seatOptions = Array.from(
    { length: RIDE_SEATS_MAX - minimumSeats + 1 },
    (_, index) => minimumSeats + index
  );

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (pending) {
      return;
    }

    const seatCount = Number(seats);
    const cleanFrom = departingFrom.trim();
    const cleanNotes = notes.trim();

    if (
      !Number.isInteger(seatCount) ||
      seatCount < RIDE_SEATS_MIN ||
      seatCount > RIDE_SEATS_MAX
    ) {
      setError("Use 1 to 12 seats.");
      return;
    }

    if (seatCount < minimumSeats) {
      setError(
        `You already have ${minimumSeats} ${
          minimumSeats === 1 ? "passenger" : "passengers"
        }.`
      );
      return;
    }

    if (!cleanFrom) {
      setError("Add where you're leaving from.");
      return;
    }

    let departAtIso: string | null = null;

    if (departAt) {
      const date = new Date(departAt);

      if (Number.isNaN(date.getTime())) {
        setError("That departure time doesn't look right.");
        return;
      }

      departAtIso = date.toISOString();
    }

    setError(null);
    setPending(true);

    try {
      const input = {
        seats: seatCount,
        departingFrom: cleanFrom,
        departAt: departAtIso,
        notes: cleanNotes || null,
      };
      const result = isEditing
        ? ride
          ? await updateEventRideAction(eventId, ride.id, input)
          : { error: "Couldn't find that ride. Refresh and try again." }
        : await createEventRideAction(eventId, input);

      if (result.error) {
        setError(result.error);
        return;
      }

      if (!result.snapshot) {
        setError("Couldn't refresh the rides. Refresh and try again.");
        return;
      }

      onSaved(result.snapshot);
    } catch {
      setError(
        isEditing
          ? "Couldn't save those changes. Try again."
          : "Couldn't offer that ride. Try again."
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="space-y-4 rounded-lg border border-border bg-surface p-4"
    >
      <h3 className="text-lg font-semibold text-text">
        {isEditing ? "Edit ride" : "Offer a ride"}
      </h3>

      <div>
        <label htmlFor="ride-seats" className={labelClass}>
          Open seats
        </label>
        <select
          id="ride-seats"
          value={seats}
          onChange={(event) => setSeats(event.target.value)}
          disabled={pending}
          className={fieldClass}
        >
          {seatOptions.map((count) => (
            <option key={count} value={count}>
              {count} {count === 1 ? "seat" : "seats"}
            </option>
          ))}
        </select>
        <p className="mt-1 text-sm text-muted">
          Passenger seats, not including you.
        </p>
      </div>

      <div>
        <label htmlFor="ride-from" className={labelClass}>
          Departing from
        </label>
        <input
          id="ride-from"
          type="text"
          value={departingFrom}
          onChange={(event) => {
            setDepartingFrom(event.target.value);

            if (error) {
              setError(null);
            }
          }}
          disabled={pending}
          autoFocus
          autoComplete="off"
          placeholder="Rina's place"
          className={fieldClass}
        />
      </div>

      <div>
        <label htmlFor="ride-depart-at" className={labelClass}>
          Departure time (optional)
        </label>
        <input
          id="ride-depart-at"
          type="datetime-local"
          value={departAt}
          onChange={(event) => {
            setDepartAt(event.target.value);

            if (error) {
              setError(null);
            }
          }}
          disabled={pending}
          className={fieldClass}
        />
      </div>

      <div>
        <label htmlFor="ride-notes" className={labelClass}>
          Notes (optional)
        </label>
        <textarea
          id="ride-notes"
          rows={3}
          value={notes}
          onChange={(event) => {
            setNotes(event.target.value);

            if (error) {
              setError(null);
            }
          }}
          disabled={pending}
          placeholder="Meet out front."
          className={`${fieldClass} resize-y`}
        />
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-lg border border-border bg-background px-3.5 py-3 text-sm text-text"
        >
          {error}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <button type="submit" disabled={pending} className={primaryButton}>
          {pending
            ? isEditing
              ? "Saving..."
              : "Offering..."
            : isEditing
            ? "Save"
            : "Offer ride"}
        </button>

        <button
          type="button"
          onClick={onCancel}
          disabled={pending}
          className={secondaryButton}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
