"use client";

import { useActionState, useState } from "react";
import {
  pickPollTimeAction,
  voteDateOptionAction,
  type PickPollTimeState,
} from "@/app/actions/events";
import { LocalTime } from "@/components/local-time";
import {
  DATE_VOTE_OPTIONS,
  type DateVote,
  type PollOption,
  type PollSnapshot,
  type PollVoter,
} from "@/lib/events";

function voterNames(voters: PollVoter[], currentUserId: string) {
  return voters
    .map((voter) => (voter.id === currentUserId ? "You" : voter.name))
    .join(", ");
}

export function PollTimePanel({
  eventId,
  currentUserId,
  isCreator,
  initialSnapshot,
}: {
  eventId: string;
  currentUserId: string;
  isCreator: boolean;
  initialSnapshot: PollSnapshot;
}) {
  const [snapshot, setSnapshot] = useState(initialSnapshot);
  const [pendingVote, setPendingVote] = useState<{
    optionId: string;
    vote: DateVote;
  } | null>(null);
  const [voteError, setVoteError] = useState<string | null>(null);
  const [pickingId, setPickingId] = useState<string | null>(null);
  const [pickState, pickAction, pickPending] = useActionState(
    pickPollTimeAction,
    {} as PickPollTimeState
  );
  const busy = pendingVote !== null || pickPending;

  async function choose(option: PollOption, vote: DateVote) {
    if (busy) {
      return;
    }

    setVoteError(null);
    setPendingVote({ optionId: option.id, vote });

    try {
      const formData = new FormData();
      formData.set("event_id", eventId);
      formData.set("option_id", option.id);
      formData.set("vote", vote);
      const result = await voteDateOptionAction({}, formData);

      if (result.error || !result.snapshot) {
        setVoteError(result.error ?? "Couldn't save your vote. Try again.");
        return;
      }

      setSnapshot(result.snapshot);
    } catch {
      setVoteError("Couldn't save your vote. Try again.");
    } finally {
      setPendingVote(null);
    }
  }

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-text">Pick a time</h2>
        <p className="mt-1 text-sm text-muted">
          Vote yes or maybe. Tap the same answer again to remove it.
        </p>
      </div>

      {voteError && (
        <p role="alert" className="text-sm text-text">
          {voteError}
        </p>
      )}

      {pickState.error && (
        <p role="alert" className="text-sm text-text">
          {pickState.error}
        </p>
      )}

      {snapshot.options.length === 0 ? (
        <p className="text-sm text-muted">No times proposed yet.</p>
      ) : (
        <div className="border-t border-line">
          {snapshot.options.map((option) => {
            const yesSelected = option.currentVote === "yes";
            const maybeSelected = option.currentVote === "maybe";

            return (
              <div key={option.id} className="border-b border-line py-4">
                <div className="flex items-baseline justify-between gap-3">
                  <p className="text-base font-medium text-text">
                    <LocalTime iso={option.startsAt} format="date" /> at{" "}
                    <LocalTime iso={option.startsAt} format="time" />
                  </p>

                  {option.isLeading && (
                    <span className="shrink-0 text-sm font-medium text-accent">
                      Leading
                    </span>
                  )}
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2">
                  {DATE_VOTE_OPTIONS.map((choice) => {
                    const selected =
                      choice.value === "yes" ? yesSelected : maybeSelected;
                    const count =
                      choice.value === "yes"
                        ? option.yesCount
                        : option.maybeCount;
                    const isPending =
                      pendingVote?.optionId === option.id &&
                      pendingVote.vote === choice.value;

                    return (
                      <button
                        key={choice.value}
                        type="button"
                        onClick={() => choose(option, choice.value)}
                        aria-pressed={selected}
                        disabled={busy}
                        className={`min-h-11 rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors duration-150 ease-out cursor-pointer disabled:opacity-60 disabled:pointer-events-none ${
                          selected
                            ? "border-accent bg-accent text-on-accent"
                            : "border-border bg-transparent text-text hover:bg-surface"
                        }`}
                      >
                        {isPending
                          ? "Saving..."
                          : `${choice.label} · ${count}`}
                      </button>
                    );
                  })}
                </div>

                {(option.yesVoters.length > 0 ||
                  option.maybeVoters.length > 0) && (
                  <div className="mt-2 space-y-1">
                    {option.yesVoters.length > 0 && (
                      <p className="text-sm text-muted break-words">
                        Yes: {voterNames(option.yesVoters, currentUserId)}
                      </p>
                    )}

                    {option.maybeVoters.length > 0 && (
                      <p className="text-sm text-muted break-words">
                        Maybe: {voterNames(option.maybeVoters, currentUserId)}
                      </p>
                    )}
                  </div>
                )}

                {isCreator && (
                  <form
                    action={pickAction}
                    onSubmit={() => setPickingId(option.id)}
                    className="mt-3"
                  >
                    <input
                      type="hidden"
                      name="event_id"
                      value={eventId}
                      readOnly
                    />
                    <input
                      type="hidden"
                      name="option_id"
                      value={option.id}
                      readOnly
                    />
                    <button
                      type="submit"
                      disabled={busy}
                      className="min-h-11 rounded-lg border border-border bg-transparent px-4 py-3 text-sm font-medium text-text transition-colors duration-150 ease-out hover:bg-surface cursor-pointer disabled:opacity-60 disabled:pointer-events-none"
                    >
                      {pickPending && pickingId === option.id
                        ? "Picking..."
                        : "Pick this time"}
                    </button>
                  </form>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
