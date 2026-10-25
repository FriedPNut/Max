"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  endHangAction,
  respondToHangAction,
} from "@/app/actions/hangs";
import { AnyoneDownSheet } from "@/components/hang/anyone-down-sheet";
import { createClient } from "@/lib/supabase/client";
import { timeLeftLabel, type HangResponse } from "@/lib/hangs";

export type HangCard = {
  id: string;
  message: string;
  location: string | null;
  expiresAt: string;
  createdBy: string;
  creatorName: string;
  isMine: boolean;
  myResponse: HangResponse | null;
  people: string[];
  laterPeople: string[];
};

const RESPONSES: { value: HangResponse; label: string }[] = [
  { value: "in", label: "I'm in" },
  { value: "later", label: "Maybe later" },
  { value: "out", label: "Can't" },
];

export function HangView({
  initialHangs,
  userId,
}: {
  initialHangs: HangCard[];
  userId: string;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [hangs, setHangs] = useState(initialHangs);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const tick = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(tick);
  }, []);

  useEffect(() => {
    const channel = supabase
      .channel("hangs-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "hangs" }, () => {
        void reload();
      })
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "hang_responses" },
        () => {
          void reload();
        }
      )
      .subscribe();

    async function reload() {
      const { data } = await supabase
        .from("hangs")
        .select("id,created_by,message,location,expires_at,created_at")
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false });

      const rows = (data ?? []) as {
        id: string;
        created_by: string;
        message: string;
        location: string | null;
        expires_at: string;
      }[];
      const ids = rows.map((row) => row.id);
      const { data: responseRows } = ids.length
        ? await supabase
            .from("hang_responses")
            .select("hang_id,user_id,response")
            .in("hang_id", ids)
        : { data: [] };
      const responses = (responseRows ?? []) as {
        hang_id: string;
        user_id: string;
        response: HangResponse;
      }[];

      setHangs((current) => {
        const nameById = new Map(
          current.flatMap((hang) => [
            [hang.createdBy, hang.creatorName] as const,
          ])
        );

        return rows.map((row) => {
          const mine = responses.find(
            (r) => r.hang_id === row.id && r.user_id === userId
          );
          const known = current.find((hang) => hang.id === row.id);

          return {
            id: row.id,
            message: row.message,
            location: row.location,
            expiresAt: row.expires_at,
            createdBy: row.created_by,
            creatorName:
              nameById.get(row.created_by) ??
              (row.created_by === userId ? "You" : "A friend"),
            isMine: row.created_by === userId,
            myResponse: mine?.response ?? null,
            people: known
              ? known.people
              : responses
                  .filter((r) => r.hang_id === row.id && r.response === "in")
                  .map(() => "A friend"),
            laterPeople: known ? known.laterPeople : [],
          };
        });
      });
    }

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [supabase, userId]);

  async function respond(hangId: string, response: HangResponse | null) {
    setError(null);
    const previous = hangs;

    // Answer on screen right away, then save in the background.
    setHangs((current) =>
      current.map((hang) =>
        hang.id === hangId ? { ...hang, myResponse: response } : hang
      )
    );

    try {
      const result = await respondToHangAction({ hangId, response });

      if (result.error) {
        setHangs(previous);
        setError(result.error);
      }
    } catch {
      setHangs(previous);
      setError("Couldn't save your answer. Try again.");
    }
  }

  async function end(hangId: string) {
    setError(null);
    const result = await endHangAction(hangId);

    if (result.error) {
      setError(result.error);
      return;
    }

    setHangs((current) => current.filter((hang) => hang.id !== hangId));
  }

  return (
    <div className="space-y-6">
      <button
        type="button"
        onClick={() => setSheetOpen(true)}
        className="min-h-11 w-full rounded-lg bg-text px-4 py-3 text-base font-medium text-background transition-opacity duration-150 ease-out hover:opacity-90 cursor-pointer"
      >
        Anyone down?
      </button>

      {error && (
        <p role="alert" className="text-sm text-text">
          {error}
        </p>
      )}

      {hangs.length === 0 ? (
        <p className="text-sm text-muted">Nobody&apos;s looking to hang right now.</p>
      ) : (
        <ul className="border-t border-line">
          {hangs.map((hang) => (
            <li key={hang.id} className="space-y-3 border-b border-line py-4">
              <div className="flex items-baseline justify-between gap-3">
                <p className="text-sm text-muted">{hang.creatorName}</p>
                <p className="shrink-0 text-sm text-muted">
                  {timeLeftLabel(hang.expiresAt, now)}
                </p>
              </div>
              <p className="whitespace-pre-wrap break-words text-base text-text">
                {hang.message}
              </p>
              {hang.location && (
                <p className="text-sm text-muted">{hang.location}</p>
              )}

              <div className="flex flex-wrap gap-2">
                {RESPONSES.map((option) => {
                  const selected = hang.myResponse === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      aria-pressed={selected}
                      onClick={() =>
                        void respond(hang.id, selected ? null : option.value)
                      }
                      className={`min-h-11 rounded-lg border px-4 text-sm transition-colors duration-150 ease-out cursor-pointer ${
                        selected
                          ? "border-text bg-text text-background"
                          : "border-border bg-transparent text-text hover:bg-surface"
                      }`}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>

              {hang.people.length > 0 && (
                <p className="text-sm text-text">In: {hang.people.join(", ")}</p>
              )}
              {hang.laterPeople.length > 0 && (
                <p className="text-sm text-muted">
                  Maybe later: {hang.laterPeople.join(", ")}
                </p>
              )}

              {hang.isMine && (
                <div className="flex gap-4 pt-1">
                  <button
                    type="button"
                    onClick={() => void end(hang.id)}
                    className="min-h-11 text-sm text-muted hover:text-text cursor-pointer"
                  >
                    End
                  </button>
                  <Link
                    href={`/events/new?hang=${hang.id}`}
                    className="inline-flex min-h-11 items-center text-sm text-text underline underline-offset-4"
                  >
                    Turn into event
                  </Link>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {sheetOpen && <AnyoneDownSheet onClose={() => setSheetOpen(false)} />}
    </div>
  );
}
