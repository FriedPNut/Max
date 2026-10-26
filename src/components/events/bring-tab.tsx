"use client";

import { Plus } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
  addEventItemAction,
  claimEventItemAction,
  deleteEventItemAction,
  unclaimEventItemAction,
} from "@/app/actions/event-plan";
import { PersonName } from "@/components/events/person-name";
import { Button, Card, inputClass } from "@/components/ui";
import { useAutofocus } from "@/lib/use-autofocus";
import type {
  EventPlanActionResult,
  EventPlanSnapshot,
} from "@/lib/event-plan";

export function BringTab({
  eventId,
  eventCreatorId,
  currentUserId,
  initialSnapshot,
}: {
  eventId: string;
  eventCreatorId: string;
  currentUserId: string;
  initialSnapshot: EventPlanSnapshot;
}) {
  const [snapshot, setSnapshot] = useState(initialSnapshot);
  const [formOpen, setFormOpen] = useState(false);
  const [label, setLabel] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [addPending, setAddPending] = useState(false);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [itemErrors, setItemErrors] = useState<Record<string, string | null>>(
    {}
  );
  const itemInputRef = useRef<HTMLInputElement>(null);
  const autofocus = useAutofocus();

  useEffect(() => {
    if (formOpen && autofocus) {
      itemInputRef.current?.focus();
    }
  }, [formOpen, autofocus]);

  const items = snapshot.items;
  const claimedCount = items.filter((item) => item.claimedBy).length;
  const isEventCreator = eventCreatorId === currentUserId;
  const busy = pendingAction !== null;

  function setItemError(itemId: string, message: string | null) {
    setItemErrors((current) => ({ ...current, [itemId]: message }));
  }

  async function runItemAction(
    key: string,
    itemId: string,
    action: () => Promise<EventPlanActionResult>
  ) {
    if (busy) {
      return;
    }

    setPendingAction(key);
    setItemError(itemId, null);

    try {
      const result = await action();

      if (result.snapshot) {
        setSnapshot(result.snapshot);
      }

      if (result.error) {
        setItemError(itemId, result.error);
      }
    } catch {
      setItemError(itemId, "Couldn't update that item. Try again.");
    } finally {
      setPendingAction(null);
    }
  }

  async function handleAdd(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (addPending) {
      return;
    }

    const cleanLabel = label.trim();

    if (!cleanLabel) {
      setFormError("Add an item first.");
      return;
    }

    setFormError(null);
    setAddPending(true);

    try {
      const result = await addEventItemAction(eventId, cleanLabel);

      if (result.snapshot) {
        setSnapshot(result.snapshot);
      }

      if (result.error) {
        setFormError(result.error);
        return;
      }

      setLabel("");
      setFormOpen(false);
    } catch {
      setFormError("Couldn't add that item. Try again.");
    } finally {
      setAddPending(false);
    }
  }

  return (
    <section className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-text">Bring</h2>
          {items.length > 0 && (
            <p className="mt-1 text-sm text-muted">
              {claimedCount} of {items.length} claimed
            </p>
          )}
        </div>

        {!formOpen && (
          <Button
            variant="secondary"
            onClick={() => {
              setFormOpen(true);
              setFormError(null);
            }}
          >
            <Plus size={24} strokeWidth={1.75} aria-hidden="true" />
            Add item
          </Button>
        )}
      </div>

      {snapshot.error && (
        <p role="alert" className="text-sm text-text">
          {snapshot.error}
        </p>
      )}

      {formOpen && (
        <Card>
        <form
          onSubmit={handleAdd}
          noValidate
          className="space-y-3 p-4"
        >
          <div>
            <label htmlFor="bring-item-label" className="mb-2 block text-sm text-muted">
              Item
            </label>
            <input
              ref={itemInputRef}
              id="bring-item-label"
              type="text"
              value={label}
              onChange={(event) => {
                setLabel(event.target.value);

                if (formError) {
                  setFormError(null);
                }
              }}
              disabled={addPending}
              autoComplete="off"
              placeholder="Ice"
              className={inputClass}
            />
          </div>

          {formError && (
            <div
              role="alert"
              className="rounded-lg bg-background px-3.5 py-3 text-sm text-text"
            >
              {formError}
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={addPending}>
              {addPending ? "Adding..." : "Add item"}
            </Button>

            <Button
              variant="secondary"
              onClick={() => {
                setFormOpen(false);
                setFormError(null);
              }}
              disabled={addPending}
            >
              Cancel
            </Button>
          </div>
        </form>
        </Card>
      )}

      {items.length === 0 ? (
        <p className="text-sm text-muted">No items yet.</p>
      ) : (
        <ul className="border-t border-line">
          {items.map((item) => {
            const isMine = item.claimedBy === currentUserId;
            const canDelete = item.createdBy === currentUserId || isEventCreator;

            return (
              <li key={item.id} className="border-b border-line py-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-base text-text break-words">
                      {item.label}
                    </p>
                    <p className="mt-1 text-sm text-muted break-words">
                      {item.claimer ? (
                        <>
                          Claimed by{" "}
                          <PersonName
                            person={item.claimer}
                            currentUserId={currentUserId}
                          />
                        </>
                      ) : (
                        "Unclaimed"
                      )}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 sm:shrink-0 sm:justify-end">
                    {!item.claimedBy && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() =>
                          runItemAction(`claim:${item.id}`, item.id, () =>
                            claimEventItemAction(eventId, item.id)
                          )
                        }
                        disabled={busy}
                      >
                        {pendingAction === `claim:${item.id}`
                          ? "Claiming..."
                          : "I'll bring it"}
                      </Button>
                    )}

                    {isMine && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() =>
                          runItemAction(`unclaim:${item.id}`, item.id, () =>
                            unclaimEventItemAction(eventId, item.id)
                          )
                        }
                        disabled={busy}
                      >
                        {pendingAction === `unclaim:${item.id}`
                          ? "Unclaiming..."
                          : "Unclaim"}
                      </Button>
                    )}

                    {canDelete && (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() =>
                          runItemAction(`delete:${item.id}`, item.id, () =>
                            deleteEventItemAction(eventId, item.id)
                          )
                        }
                        disabled={busy}
                      >
                        {pendingAction === `delete:${item.id}`
                          ? "Deleting..."
                          : "Delete"}
                      </Button>
                    )}
                  </div>
                </div>

                {itemErrors[item.id] && (
                  <p role="alert" className="mt-2 text-sm text-text">
                    {itemErrors[item.id]}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
