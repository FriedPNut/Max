"use client";

import { Plus } from "lucide-react";
import { useState } from "react";
import {
  deleteEventRideAction,
  joinEventRideAction,
  leaveEventRideAction,
  removeEventRidePassengerAction,
} from "@/app/actions/event-plan";
import { PersonName } from "@/components/events/person-name";
import { RideForm } from "@/components/events/ride-form";
import { LocalTime } from "@/components/local-time";
import { Button, Card } from "@/components/ui";
import type {
  EventPlanActionResult,
  EventPlanSnapshot,
  EventRide,
} from "@/lib/event-plan";

type FormState =
  | { type: "create" }
  | { type: "edit"; ride: EventRide }
  | null;

export function RidesTab({
  eventId,
  currentUserId,
  initialSnapshot,
}: {
  eventId: string;
  currentUserId: string;
  initialSnapshot: EventPlanSnapshot;
}) {
  const [snapshot, setSnapshot] = useState(initialSnapshot);
  const [form, setForm] = useState<FormState>(null);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [rideErrors, setRideErrors] = useState<Record<string, string | null>>(
    {}
  );
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const rides = snapshot.rides;
  const myRide =
    rides.find((ride) => ride.driverId === currentUserId) ??
    rides.find((ride) =>
      ride.passengers.some((passenger) => passenger.id === currentUserId)
    ) ??
    null;
  const busy = pendingAction !== null;

  function setRideError(rideId: string, message: string | null) {
    setRideErrors((current) => ({ ...current, [rideId]: message }));
  }

  async function runRideAction(
    key: string,
    rideId: string,
    action: () => Promise<EventPlanActionResult>,
    onSuccess?: () => void
  ) {
    if (busy) {
      return;
    }

    setPendingAction(key);
    setRideError(rideId, null);

    try {
      const result = await action();

      if (result.snapshot) {
        setSnapshot(result.snapshot);
      }

      if (result.error) {
        setRideError(rideId, result.error);
        return;
      }

      onSuccess?.();
    } catch {
      setRideError(rideId, "Couldn't update that ride. Try again.");
    } finally {
      setPendingAction(null);
    }
  }

  function handleJoin(rideId: string) {
    void runRideAction(`join:${rideId}`, rideId, () =>
      joinEventRideAction(eventId, rideId)
    );
  }

  function handleLeave(rideId: string) {
    void runRideAction(`leave:${rideId}`, rideId, () =>
      leaveEventRideAction(eventId, rideId)
    );
  }

  function handleRemovePassenger(rideId: string, passengerId: string) {
    void runRideAction(
      `remove:${rideId}:${passengerId}`,
      rideId,
      () => removeEventRidePassengerAction(eventId, rideId, passengerId)
    );
  }

  function handleDelete(rideId: string) {
    void runRideAction(
      `delete:${rideId}`,
      rideId,
      () => deleteEventRideAction(eventId, rideId),
      () => {
        setConfirmDeleteId(null);
        setForm((current) =>
          current?.type === "edit" && current.ride.id === rideId
            ? null
            : current
        );
      }
    );
  }

  function handleEdit(ride: EventRide) {
    setConfirmDeleteId(null);
    setRideError(ride.id, null);
    setForm({ type: "edit", ride });
  }

  return (
    <section className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-text">Rides</h2>
          {myRide && (
            <p className="mt-1 text-sm text-muted">
              {myRide.driverId === currentUserId
                ? "You're driving for this event."
                : "You're already in a car for this event."}
            </p>
          )}
        </div>

        {!form && !myRide && (
          <Button variant="secondary" onClick={() => setForm({ type: "create" })}>
            <Plus size={24} strokeWidth={1.75} aria-hidden="true" />
            Offer a ride
          </Button>
        )}
      </div>

      {snapshot.error && (
        <p role="alert" className="text-sm text-text">
          {snapshot.error}
        </p>
      )}

      {form && (
        <RideForm
          key={form.type === "edit" ? form.ride.id : "new"}
          eventId={eventId}
          mode={form.type}
          ride={form.type === "edit" ? form.ride : undefined}
          onCancel={() => setForm(null)}
          onSaved={(next) => {
            setSnapshot(next);
            setForm(null);
            setConfirmDeleteId(null);
          }}
        />
      )}

      {rides.length === 0 ? (
        <p className="text-sm text-muted">No rides yet.</p>
      ) : (
        <div className="border-t border-line">
          {rides.map((ride) => (
            <RideRow
              key={ride.id}
              ride={ride}
              currentUserId={currentUserId}
              myRide={myRide}
              busy={busy}
              pendingAction={pendingAction}
              confirmingDelete={confirmDeleteId === ride.id}
              error={rideErrors[ride.id] ?? null}
              onJoin={() => handleJoin(ride.id)}
              onLeave={() => handleLeave(ride.id)}
              onEdit={() => handleEdit(ride)}
              onRequestDelete={() => setConfirmDeleteId(ride.id)}
              onCancelDelete={() => setConfirmDeleteId(null)}
              onDelete={() => handleDelete(ride.id)}
              onRemovePassenger={(passengerId) =>
                handleRemovePassenger(ride.id, passengerId)
              }
            />
          ))}
        </div>
      )}
    </section>
  );
}

function RideRow({
  ride,
  currentUserId,
  myRide,
  busy,
  pendingAction,
  confirmingDelete,
  error,
  onJoin,
  onLeave,
  onEdit,
  onRequestDelete,
  onCancelDelete,
  onDelete,
  onRemovePassenger,
}: {
  ride: EventRide;
  currentUserId: string;
  myRide: EventRide | null;
  busy: boolean;
  pendingAction: string | null;
  confirmingDelete: boolean;
  error: string | null;
  onJoin: () => void;
  onLeave: () => void;
  onEdit: () => void;
  onRequestDelete: () => void;
  onCancelDelete: () => void;
  onDelete: () => void;
  onRemovePassenger: (passengerId: string) => void;
}) {
  const isDriver = ride.driverId === currentUserId;
  const isPassenger = ride.passengers.some(
    (passenger) => passenger.id === currentUserId
  );
  const isFull = ride.passengers.length >= ride.seats;
  const blocked = Boolean(myRide && myRide.id !== ride.id);
  const blockedMessage =
    myRide?.driverId === currentUserId
      ? "You're already driving a car for this event."
      : "You're already in another car for this event.";

  return (
    <article className="border-b border-line py-4">
      <div className="flex items-start justify-between gap-4">
        <p className="min-w-0 text-base font-semibold text-text break-words">
          <PersonName person={ride.driver} currentUserId={currentUserId} />
        </p>

        <p className="shrink-0 text-sm text-muted">
          {ride.passengers.length} / {ride.seats} seats
        </p>
      </div>

      <p className="mt-1 text-sm text-text break-words">
        From {ride.departingFrom}
      </p>

      {ride.departAt && (
        <p className="mt-1 text-sm text-muted">
          Leaves <LocalTime iso={ride.departAt} format="card" />
        </p>
      )}

      {ride.notes && (
        <p className="mt-2 text-sm leading-relaxed text-text whitespace-pre-line break-words">
          {ride.notes}
        </p>
      )}

      <div className="mt-3">
        <p className="text-sm text-muted">Passengers</p>

        {ride.passengers.length === 0 ? (
          <p className="mt-1 text-sm text-muted">No passengers yet.</p>
        ) : (
          <ul className="mt-1 divide-y divide-line">
            {ride.passengers.map((passenger) => (
              <li
                key={passenger.id}
                className={`flex items-center justify-between gap-3 ${
                  isDriver ? "min-h-11 py-2" : "py-1.5"
                }`}
              >
                <span className="min-w-0 text-sm text-text break-words">
                  <PersonName
                    person={passenger}
                    currentUserId={currentUserId}
                  />
                </span>

                {isDriver && (
                  <Button
                    variant="text"
                    size="sm"
                    onClick={() => onRemovePassenger(passenger.id)}
                    disabled={busy}
                    className="shrink-0"
                  >
                    {pendingAction === `remove:${ride.id}:${passenger.id}`
                      ? "Removing..."
                      : "Remove"}
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {isDriver ? (
        confirmingDelete ? (
          <Card className="mt-3 space-y-3 p-3">
            <p className="text-sm text-text">
              Delete this ride? Passengers will lose their seats.
            </p>

            <div className="flex flex-wrap gap-2">
              <Button
                variant="destructive"
                onClick={onDelete}
                disabled={busy}
              >
                {pendingAction === `delete:${ride.id}`
                  ? "Deleting..."
                  : "Delete ride"}
              </Button>

              <Button
                variant="secondary"
                onClick={onCancelDelete}
                disabled={busy}
              >
                Cancel
              </Button>
            </div>
          </Card>
        ) : (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={onEdit}
              disabled={busy}
            >
              Edit ride
            </Button>

            <Button
              variant="text"
              size="sm"
              onClick={onRequestDelete}
              disabled={busy}
            >
              Delete
            </Button>
          </div>
        )
      ) : isPassenger ? (
        <div className="mt-3">
          <Button variant="secondary" onClick={onLeave} disabled={busy}>
            {pendingAction === `leave:${ride.id}` ? "Leaving..." : "Leave"}
          </Button>
        </div>
      ) : (
        <div className="mt-3 space-y-2">
          <Button
            onClick={onJoin}
            disabled={busy || isFull || blocked}
          >
            {pendingAction === `join:${ride.id}`
              ? "Joining..."
              : isFull
              ? "Full"
              : "Join"}
          </Button>

          {blocked && !isFull && (
            <p className="text-sm text-muted">{blockedMessage}</p>
          )}
        </div>
      )}

      {error && (
        <p role="alert" className="mt-2 text-sm text-text">
          {error}
        </p>
      )}
    </article>
  );
}
