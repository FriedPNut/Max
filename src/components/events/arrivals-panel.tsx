"use client";

import { useEffect, useMemo, useState } from "react";
import { cancelArrivalAction, setHereAction, setOnMyWayAction } from "@/app/actions/event-arrivals";
import { Button, Chip } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";
import {
  ARRIVAL_ETA_OPTIONS,
  arrivalEtaLabel,
  isArrivalFresh,
  type ArrivalRecord,
} from "@/lib/event-arrivals";

export type ArrivalPerson = { id: string; name: string };

export function ArrivalsPanel({
  eventId,
  currentUserId,
  canAct,
  people,
  initialRows,
}: {
  eventId: string;
  currentUserId: string;
  canAct: boolean;
  people: ArrivalPerson[];
  initialRows: ArrivalRecord[];
}) {
  const supabase = useMemo(() => createClient(), []);
  const [rows, setRows] = useState<ArrivalRecord[]>(initialRows);
  const [now, setNow] = useState(() => Date.now());
  const [picking, setPicking] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Live updates: the RLS policy lets everyone signed in read these rows.
  useEffect(() => {
    const channel = supabase
      .channel(`event-arrivals-${eventId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "event_arrivals", filter: `event_id=eq.${eventId}` },
        (payload) => {
          if (payload.eventType === "DELETE") {
            const old = payload.old as { user_id?: string };
            setRows((current) => current.filter((row) => row.user_id !== old.user_id));
            return;
          }
          const next = payload.new as ArrivalRecord;
          setRows((current) => [...current.filter((row) => row.user_id !== next.user_id), next]);
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [eventId, supabase]);

  // Re-render every 30 seconds so "about N min" counts down and turns into "any minute".
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  const fresh = rows.filter((row) => isArrivalFresh(row.updated_at, now));
  const onWay = fresh.filter((row) => row.status === "on_my_way");
  const here = fresh.filter((row) => row.status === "here");
  const mine = fresh.find((row) => row.user_id === currentUserId) ?? null;
  const nameFor = (userId: string) => people.find((person) => person.id === userId)?.name ?? "A friend";

  async function run(action: () => Promise<{ error?: string }>) {
    if (pending) return;
    setPending(true);
    setError(null);
    const result = await action();
    setPending(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    setPicking(false);
  }

  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold text-text">Arrivals</h2>

      {canAct && (
        <div className="space-y-3">
          {picking ? (
            <div className="space-y-2">
              <p className="text-sm text-muted">How far away are you?</p>
              <div className="flex flex-wrap gap-2">
                {ARRIVAL_ETA_OPTIONS.map((minutes) => (
                  <Chip
                    key={minutes}
                    disabled={pending}
                    onClick={() => void run(() => setOnMyWayAction(eventId, minutes))}
                  >
                    {minutes} min
                  </Chip>
                ))}
                <Button variant="text" size="sm" onClick={() => setPicking(false)} disabled={pending}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="secondary" disabled={pending} onClick={() => setPicking(true)}>
                On my way
              </Button>
              <Button disabled={pending} onClick={() => void run(() => setHereAction(eventId))}>
                I&apos;m here
              </Button>
              {mine && (
                <Button variant="text" size="sm" disabled={pending} onClick={() => void run(() => cancelArrivalAction(eventId))}>
                  Cancel
                </Button>
              )}
            </div>
          )}
        </div>
      )}

      {error && <p role="alert" className="text-sm text-text">{error}</p>}

      {onWay.length === 0 && here.length === 0 ? (
        <p className="text-sm text-muted">Nobody has checked in yet.</p>
      ) : (
        <div className="space-y-4">
          {onWay.length > 0 && (
            <div>
              <p className="text-sm text-muted">On the way</p>
              <ul className="mt-1 divide-y divide-line border-t border-line">
                {onWay.map((row) => (
                  <li key={row.user_id} className="flex min-h-11 items-center justify-between gap-3 py-2 text-base text-text">
                    <span>{row.user_id === currentUserId ? "You" : nameFor(row.user_id)}</span>
                    <span className="text-sm text-muted">{arrivalEtaLabel(row, now)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {here.length > 0 && (
            <div>
              <p className="text-sm text-muted">Here</p>
              <ul className="mt-1 divide-y divide-line border-t border-line">
                {here.map((row) => (
                  <li key={row.user_id} className="flex min-h-11 items-center py-2 text-base text-text">
                    {row.user_id === currentUserId ? "You" : nameFor(row.user_id)}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
