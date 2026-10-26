"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  addItineraryItemAction,
  addPackingItemAction,
  addTripLinkAction,
  deleteItineraryItemAction,
  deletePackingItemAction,
  deleteTripLinkAction,
  togglePackingItemAction,
} from "@/app/actions/trip-tabs";
import { TRIP_LINK_KINDS, TRIP_LINK_LABELS, type TripLinkKind } from "@/lib/trips";

const fieldClass = "w-full rounded-lg border border-border bg-surface px-3 py-3 text-base text-text focus:outline-2 focus:outline-text";
const buttonClass = "inline-flex min-h-11 items-center justify-center rounded-lg border border-border px-4 py-3 text-sm font-medium text-text hover:bg-surface disabled:opacity-60 cursor-pointer";
const rowClass = "flex min-h-11 items-center justify-between gap-3 border-b border-line py-3";

type ItineraryItem = { id: string; day: string; title: string; time_label: string | null };
type PackingItem = { id: string; label: string; packed: boolean };
type TripLink = { id: string; kind: TripLinkKind; title: string; url: string };

// Shared runner: calls an action, shows its error, and refreshes server data on success.
function useAction(router: ReturnType<typeof useRouter>) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(action: () => Promise<{ error?: string }>, onSuccess?: () => void) {
    if (pending) return;
    setPending(true);
    setError(null);
    const result = await action();
    setPending(false);

    if (result.error) {
      setError(result.error);
      return false;
    }

    onSuccess?.();
    router.refresh();
    return true;
  }

  return { pending, error, run };
}

export function ItineraryPanel({ tripId, items, days }: { tripId: string; items: ItineraryItem[]; days: string[] }) {
  const router = useRouter();
  const { pending, error, run } = useAction(router);
  const [day, setDay] = useState(days[0] ?? "");
  const [title, setTitle] = useState("");
  const [time, setTime] = useState("");

  return (
    <div className="space-y-6">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void run(() => addItineraryItemAction({ tripId, day, title, timeLabel: time }), () => {
            setTitle("");
            setTime("");
          });
        }}
        className="space-y-3"
      >
        <select aria-label="Day" value={day} onChange={(e) => setDay(e.target.value)} disabled={pending} className={fieldClass}>
          {days.map((d) => <option key={d} value={d}>{d}</option>)}
        </select>
        <input aria-label="Plan" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} placeholder="Dinner at the pier" disabled={pending} className={fieldClass} />
        <input aria-label="Time" value={time} onChange={(e) => setTime(e.target.value)} maxLength={40} placeholder="7:00 PM (optional)" disabled={pending} className={fieldClass} />
        <button type="submit" disabled={pending} className={buttonClass}>Add to itinerary</button>
      </form>

      {days.map((d) => {
        const dayItems = items.filter((item) => item.day === d);
        return (
          <section key={d} className="space-y-2">
            <h3 className="text-sm text-muted">{d}</h3>
            {dayItems.length === 0 ? <p className="text-sm text-muted">Nothing planned.</p> : (
              <ul className="border-t border-line">
                {dayItems.map((item) => (
                  <li key={item.id} className={rowClass}>
                    <span className="text-base text-text">{item.time_label ? `${item.time_label} · ` : ""}{item.title}</span>
                    <button type="button" disabled={pending} onClick={() => void run(() => deleteItineraryItemAction(tripId, item.id))} className="min-h-11 px-2 text-sm text-muted hover:text-text cursor-pointer">Delete</button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        );
      })}
      {error && <p role="alert" className="text-sm text-text">{error}</p>}
    </div>
  );
}

export function PackingPanel({ tripId, items }: { tripId: string; items: PackingItem[] }) {
  const router = useRouter();
  const { pending, error, run } = useAction(router);
  const [label, setLabel] = useState("");

  return (
    <div className="space-y-6">
      <form onSubmit={(event) => { event.preventDefault(); void run(() => addPackingItemAction(tripId, label), () => setLabel("")); }} className="flex gap-2">
        <input aria-label="Packing item" value={label} onChange={(e) => setLabel(e.target.value)} maxLength={120} placeholder="Sunscreen" disabled={pending} className={fieldClass} />
        <button type="submit" disabled={pending} className={buttonClass}>Add</button>
      </form>

      {items.length === 0 ? <p className="text-sm text-muted">Nothing on the list yet.</p> : (
        <ul className="border-t border-line">
          {items.map((item) => (
            <li key={item.id} className={rowClass}>
              <label className="flex min-w-0 flex-1 items-center gap-3 text-base text-text">
                <input type="checkbox" checked={item.packed} disabled={pending} onChange={() => void run(() => togglePackingItemAction(tripId, item.id, !item.packed))} className="h-4 w-4 accent-text" />
                <span className={item.packed ? "truncate text-muted line-through" : "truncate"}>{item.label}</span>
              </label>
              <button type="button" disabled={pending} onClick={() => void run(() => deletePackingItemAction(tripId, item.id))} className="min-h-11 px-2 text-sm text-muted hover:text-text cursor-pointer">Delete</button>
            </li>
          ))}
        </ul>
      )}
      {error && <p role="alert" className="text-sm text-text">{error}</p>}
    </div>
  );
}

export function LinksPanel({ tripId, links }: { tripId: string; links: TripLink[] }) {
  const router = useRouter();
  const { pending, error, run } = useAction(router);
  const [kind, setKind] = useState<TripLinkKind>("lodging");
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");

  return (
    <div className="space-y-6">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void run(() => addTripLinkAction({ tripId, kind, title, url }), () => {
            setTitle("");
            setUrl("");
          });
        }}
        className="space-y-3"
      >
        <select aria-label="Link type" value={kind} onChange={(e) => setKind(e.target.value as TripLinkKind)} disabled={pending} className={fieldClass}>
          {TRIP_LINK_KINDS.map((k) => <option key={k} value={k}>{TRIP_LINK_LABELS[k]}</option>)}
        </select>
        <input aria-label="Link title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} placeholder="Booking confirmation" disabled={pending} className={fieldClass} />
        <input aria-label="Link URL" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://" disabled={pending} className={fieldClass} />
        <button type="submit" disabled={pending} className={buttonClass}>Save link</button>
      </form>

      {TRIP_LINK_KINDS.map((k) => {
        const group = links.filter((link) => link.kind === k);
        if (group.length === 0) return null;
        return (
          <section key={k} className="space-y-2">
            <h3 className="text-sm text-muted">{TRIP_LINK_LABELS[k]}</h3>
            <ul className="border-t border-line">
              {group.map((link) => (
                <li key={link.id} className={rowClass}>
                  <a href={link.url} target="_blank" rel="noopener noreferrer" className="selectable min-w-0 truncate text-base text-text underline">{link.title}</a>
                  <button type="button" disabled={pending} onClick={() => void run(() => deleteTripLinkAction(tripId, link.id))} className="min-h-11 px-2 text-sm text-muted hover:text-text cursor-pointer">Delete</button>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
      {error && <p role="alert" className="text-sm text-text">{error}</p>}
    </div>
  );
}
