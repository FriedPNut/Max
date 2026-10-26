"use client";

import Link from "next/link";
import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import type { EventFormState } from "@/app/actions/events";
import {
  MAX_UPLOAD_BYTES,
  resizeImageToWidth,
  uploadImageWithProgress,
} from "@/lib/client-image";
import {
  EVENTS_BUCKET,
  MAX_OCCURRENCES,
  RECURRENCE_OPTIONS,
  SERIES_SCOPE_OPTIONS,
  isRecurrence,
  type Recurrence,
} from "@/lib/events";
import {
  defaultUntilDateKey,
  generateOccurrenceDateKeys,
} from "@/lib/recurrence";
import { createClient } from "@/lib/supabase/client";
import { Switch } from "@/components/ui/switch";
import {
  Button,
  buttonStyles,
  Card,
  Input,
  Textarea,
  inputClass,
} from "@/components/ui";

const COVER_WIDTH = 1600;
const JPEG_QUALITY = 0.8;

const labelClass = "block text-[13px] text-muted mb-2";

type CoverPhase = "idle" | "preparing" | "uploading";

type PollOptionInput = {
  id: number;
  date: string;
  time: string;
};

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function toLocalIso(dateValue: string, timeValue: string) {
  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateValue);
  const timeMatch = /^(\d{2}):(\d{2})/.exec(timeValue);

  if (!dateMatch || !timeMatch) {
    return "";
  }

  const local = new Date(
    Number(dateMatch[1]),
    Number(dateMatch[2]) - 1,
    Number(dateMatch[3]),
    Number(timeMatch[1]),
    Number(timeMatch[2]),
    0,
    0
  );

  return Number.isNaN(local.getTime()) ? "" : local.toISOString();
}

export function EventForm({
  mode,
  action,
  cancelHref,
  initialValues,
  initialStartsAt,
  ideaId,
  userId,
  initialCoverPath,
  coverUrl,
  hasSeries = false,
}: {
  mode: "create" | "edit";
  action: (state: EventFormState, formData: FormData) => Promise<EventFormState>;
  cancelHref: string;
  initialValues?: {
    title: string;
    description: string | null;
    location: string;
    capacity?: number | null;
  };
  initialStartsAt?: string;
  ideaId?: string;
  userId: string;
  initialCoverPath?: string | null;
  coverUrl?: string | null;
  hasSeries?: boolean;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const supabase = useMemo(() => createClient(), []);
  const [clientError, setClientError] = useState<string | null>(null);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [timezoneOffset, setTimezoneOffset] = useState("");
  const [timeZone, setTimeZone] = useState("UTC");
  const [recurrence, setRecurrence] = useState<Recurrence>("none");
  const [until, setUntil] = useState("");
  const [untilTouched, setUntilTouched] = useState(false);
  const [pollOpen, setPollOpen] = useState(false);
  const [pollOptions, setPollOptions] = useState<PollOptionInput[]>([
    { id: 1, date: "", time: "" },
    { id: 2, date: "", time: "" },
  ]);
  const nextPollOptionId = useRef(3);
  const [coverPath, setCoverPath] = useState(initialCoverPath ?? "");
  const [coverPreviewUrl, setCoverPreviewUrl] = useState<string | null>(
    coverUrl ?? null
  );
  const [coverPhase, setCoverPhase] = useState<CoverPhase>("idle");
  const [coverProgress, setCoverProgress] = useState(0);
  const [coverError, setCoverError] = useState<string | null>(null);
  const previewRef = useRef<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const startsAtValue = toLocalIso(date, time);
  const startsAtMs = startsAtValue ? new Date(startsAtValue).getTime() : NaN;
  const isPastDate = Number.isFinite(startsAtMs) && startsAtMs < Date.now();
  const coverBusy = coverPhase !== "idle";
  const busy = pending || coverBusy;
  const isEditing = mode === "edit";
  const previewCount =
    !isEditing &&
    recurrence !== "none" &&
    date &&
    until &&
    until >= date
      ? generateOccurrenceDateKeys(date, until, recurrence).length
      : null;

  useEffect(() => {
    setTimezoneOffset(String(new Date().getTimezoneOffset()));
    const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    if (zone) {
      setTimeZone(zone);
    }
  }, []);

  useEffect(() => {
    return () => {
      if (previewRef.current) {
        URL.revokeObjectURL(previewRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!initialStartsAt) {
      return;
    }

    const startsAt = new Date(initialStartsAt);

    if (Number.isNaN(startsAt.getTime())) {
      return;
    }

    setDate(
      `${startsAt.getFullYear()}-${pad(startsAt.getMonth() + 1)}-${pad(
        startsAt.getDate()
      )}`
    );
    setTime(`${pad(startsAt.getHours())}:${pad(startsAt.getMinutes())}`);
  }, [initialStartsAt]);

  function handleDateChange(value: string) {
    setDate(value);

    if (!untilTouched && value) {
      setUntil(defaultUntilDateKey(value));
    }
  }

  function handleRecurrenceChange(value: Recurrence) {
    setRecurrence(value);

    if (value !== "none" && !untilTouched && date && !until) {
      setUntil(defaultUntilDateKey(date));
    }
  }

  function handleUntilChange(value: string) {
    setUntil(value);
    setUntilTouched(true);
  }

  function handlePollToggle(next: boolean) {
    setPollOpen(next);

    if (!next) {
      return;
    }

    setPollOptions((current) => {
      if (current.some((option) => option.date || option.time)) {
        return current;
      }

      return [
        { id: current[0]?.id ?? 1, date, time },
        { id: current[1]?.id ?? 2, date: "", time: "" },
      ];
    });
  }

  function addPollOption() {
    const id = nextPollOptionId.current++;

    setPollOptions((current) =>
      current.length >= 6
        ? current
        : [...current, { id, date: "", time: "" }]
    );
  }

  function updatePollOption(
    id: number,
    field: "date" | "time",
    value: string
  ) {
    setPollOptions((current) =>
      current.map((option) =>
        option.id === id ? { ...option, [field]: value } : option
      )
    );
  }

  function removePollOption(id: number) {
    setPollOptions((current) =>
      current.length <= 2
        ? current
        : current.filter((option) => option.id !== id)
    );
  }

  function resetCoverPreview() {
    if (previewRef.current) {
      URL.revokeObjectURL(previewRef.current);
      previewRef.current = null;
    }

    setCoverPreviewUrl(coverUrl ?? null);
    setCoverPath(initialCoverPath ?? "");
  }

  async function handleCoverChange(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file || busy) {
      return;
    }

    setCoverError(null);

    if (file.type && !file.type.startsWith("image/")) {
      setCoverError("Pick a photo.");
      return;
    }

    if (file.size > MAX_UPLOAD_BYTES) {
      setCoverError("That photo is too big. Pick one under 30 MB.");
      return;
    }

    setCoverPhase("preparing");
    setCoverProgress(0);

    try {
      const resized = await resizeImageToWidth(
        file,
        COVER_WIDTH,
        JPEG_QUALITY
      );

      if (previewRef.current) {
        URL.revokeObjectURL(previewRef.current);
      }

      const preview = URL.createObjectURL(resized);
      previewRef.current = preview;
      setCoverPreviewUrl(preview);
      setCoverPhase("uploading");

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error("signed out");
      }

      const path = `events/${userId}/${Date.now()}.jpg`;

      await uploadImageWithProgress({
        file: resized,
        bucket: EVENTS_BUCKET,
        path,
        token: session.access_token,
        onProgress: setCoverProgress,
      });

      setCoverPath(path);
      setCoverPhase("idle");
    } catch {
      resetCoverPreview();
      setCoverError("Couldn't upload that cover. Try again.");
      setCoverProgress(0);
      setCoverPhase("idle");
    }
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    const form = event.currentTarget;
    const title = String(
      (form.elements.namedItem("title") as HTMLInputElement | null)?.value ?? ""
    ).trim();
    const location = String(
      (form.elements.namedItem("location") as HTMLInputElement | null)?.value ??
        ""
    ).trim();
    const capacity = String(
      (form.elements.namedItem("capacity") as HTMLInputElement | null)?.value ??
        ""
    ).trim();

    let message: string | null = null;

    if (!title) {
      message = "Give your plan a name.";
    } else if (!location) {
      message = "Where's it happening?";
    } else if (!isEditing && pollOpen) {
      if (pollOptions.length < 2 || pollOptions.length > 6) {
        message = "Add between 2 and 6 time options.";
      } else if (pollOptions.some((option) => !option.date || !option.time)) {
        message = "Add a date and time for each option.";
      } else if (
        new Set(
          pollOptions.map((option) => `${option.date}T${option.time}`)
        ).size !== pollOptions.length
      ) {
        message = "Each time option needs to be different.";
      }
    } else if (!date || !time) {
      message = "Pick a date and time.";
    } else if (!startsAtValue) {
      message = "That date and time doesn't look right.";
    } else if (
      !isEditing &&
      !pollOpen &&
      recurrence !== "none" &&
      !until
    ) {
      message = "Pick an end date for the repeat.";
    } else if (
      !isEditing &&
      !pollOpen &&
      recurrence !== "none" &&
      until < date
    ) {
      message = "The repeat can't end before it starts.";
    } else if (
      capacity &&
      (!/^\d+$/.test(capacity) || Number(capacity) < 1)
    ) {
      message = "Use a whole number for max people.";
    } else if (coverBusy) {
      message = "Wait for the cover to finish uploading.";
    }

    if (message) {
      event.preventDefault();
      setClientError(message);
      return;
    }

    setClientError(null);
  }

  const error = clientError ?? state.error;

  return (
    <form
      action={formAction}
      onSubmit={handleSubmit}
      onInput={() => {
        if (clientError) {
          setClientError(null);
        }
      }}
      className="space-y-5"
      noValidate
    >
      <input type="hidden" name="starts_at" value={startsAtValue} readOnly />
      <input
        type="hidden"
        name="timezone_offset"
        value={timezoneOffset}
        readOnly
      />
      <input type="hidden" name="timezone" value={timeZone} readOnly />
      <input type="hidden" name="cover_path" value={coverPath} readOnly />
      {ideaId && (
        <input type="hidden" name="idea_id" value={ideaId} readOnly />
      )}

      <Card className="space-y-5 p-4">
        <h2 className="text-base font-semibold text-text">Details</h2>

        <div>
          <label htmlFor="title" className={labelClass}>
            Title
          </label>
          <Input
            id="title"
            name="title"
            type="text"
            required
            autoComplete="off"
            placeholder="Dinner at Rina's"
            defaultValue={initialValues?.title ?? ""}
          />
        </div>

        <div>
          <label htmlFor="description" className={labelClass}>
            Description (optional)
          </label>
          <Textarea
            id="description"
            name="description"
            rows={4}
            placeholder="Bring something cold. We'll eat on the roof."
            defaultValue={initialValues?.description ?? ""}
            className="min-h-[112px] resize-y"
          />
        </div>

        <div>
          <span className="mb-2 block text-[13px] text-muted">
            Cover photo (optional)
          </span>

          {coverPreviewUrl && (
            <img draggable={false}
              src={coverPreviewUrl}
              alt="Event cover preview"
              className="mb-3 aspect-video w-full rounded-lg border border-line bg-surface object-cover"
            />
          )}

          <Button
            type="button"
            variant="secondary"
            onClick={() => fileInputRef.current?.click()}
            disabled={busy}
          >
            {coverPath ? "Change cover" : "Choose cover"}
          </Button>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleCoverChange}
            disabled={busy}
            className="hidden"
          />

          {coverPhase === "preparing" && (
            <p className="mt-2 text-sm text-muted">Preparing cover...</p>
          )}

          {coverPhase === "uploading" && (
            <div className="mt-3 space-y-2">
              <div className="h-[2px] w-full bg-line" aria-hidden="true">
                <div
                  className="h-full bg-primary"
                  style={{ width: `${coverProgress}%` }}
                />
              </div>
              <p className="text-sm text-muted">
                Uploading cover {coverProgress}%
              </p>
            </div>
          )}

          {coverError && (
            <p role="alert" className="mt-2 text-sm text-danger">
              {coverError}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="location" className={labelClass}>
            Location
          </label>
          <Input
            id="location"
            name="location"
            type="text"
            required
            autoComplete="off"
            placeholder="Rina's place, 42 Orchard St"
            defaultValue={initialValues?.location ?? ""}
          />
        </div>
      </Card>

      <Card className="space-y-5 p-4">
        <h2 className="text-base font-semibold text-text">Time</h2>

        {!isEditing && (
          <>
            <input
              type="hidden"
              name="poll_open"
              value={pollOpen ? "true" : "false"}
              readOnly
            />

            <div className="flex min-h-11 items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="text-base text-text">Let people vote on a time</p>
                <p className="mt-0.5 text-sm text-muted">
                  Add a few options and everyone can answer.
                </p>
              </div>
              <Switch
                checked={pollOpen}
                onChange={() => handlePollToggle(!pollOpen)}
                label="Let people vote on a time"
              />
            </div>
          </>
        )}

      {!isEditing && pollOpen ? (
        <div className="space-y-4">
          <div className="flex items-baseline justify-between gap-3">
            <p className="text-sm text-muted">Time options</p>
            <p className="text-sm text-muted">{pollOptions.length} of 6</p>
          </div>

          <p className="text-sm text-muted">
            Add 2 to 6 times. Everyone can vote yes or maybe.
          </p>

          <div className="space-y-5">
            {pollOptions.map((option, index) => (
              <div key={option.id} className="space-y-2">
                <div className="flex min-h-11 items-center justify-between gap-3">
                  <p className="text-sm text-muted">Option {index + 1}</p>

                  {pollOptions.length > 2 && (
                    <Button
                      type="button"
                      variant="text"
                      size="sm"
                      onClick={() => removePollOption(option.id)}
                    >
                      Remove
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label
                      htmlFor={`option-date-${option.id}`}
                      className={labelClass}
                    >
                      Date
                    </label>
                    <Input
                      id={`option-date-${option.id}`}
                      name="option_date"
                      type="date"
                      required
                      value={option.date}
                      onChange={(event) =>
                        updatePollOption(option.id, "date", event.target.value)
                      }
                    />
                  </div>

                  <div>
                    <label
                      htmlFor={`option-time-${option.id}`}
                      className={labelClass}
                    >
                      Time
                    </label>
                    <Input
                      id={`option-time-${option.id}`}
                      name="option_time"
                      type="time"
                      required
                      value={option.time}
                      onChange={(event) =>
                        updatePollOption(option.id, "time", event.target.value)
                      }
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {pollOptions.length < 6 && (
            <Button type="button" variant="secondary" onClick={addPollOption}>
              Add time
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-5">
          <div>
            <label htmlFor="date" className={labelClass}>
              Date
            </label>
            <Input
              id="date"
              name="date"
              type="date"
              required
              value={date}
              onChange={(event) => handleDateChange(event.target.value)}
            />
          </div>

          <div>
            <label htmlFor="time" className={labelClass}>
              Start time
            </label>
            <Input
              id="time"
              name="time"
              type="time"
              required
              value={time}
              onChange={(event) => setTime(event.target.value)}
            />
          </div>
        </div>
      )}

      {!isEditing && !pollOpen && (
        <>
          <div>
            <label htmlFor="recurrence" className={labelClass}>
              Repeat
            </label>
            <select
              id="recurrence"
              name="recurrence"
              value={recurrence}
              onChange={(event) => {
                const value = event.target.value;

                if (isRecurrence(value)) {
                  handleRecurrenceChange(value);
                }
              }}
              className={inputClass}
            >
              {RECURRENCE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="until" className={labelClass}>
              Until
            </label>
            <Input
              id="until"
              name="until"
              type="date"
              required
              value={until}
              min={date || undefined}
              disabled={recurrence === "none"}
              onChange={(event) => handleUntilChange(event.target.value)}
            />

            {recurrence !== "none" &&
              previewCount !== null &&
              previewCount > 0 && (
                <p className="mt-2 text-sm text-muted">
                  {previewCount} {previewCount === 1 ? "event" : "events"}
                  {previewCount === MAX_OCCURRENCES
                    ? " (the maximum)"
                    : ""}
                </p>
              )}
          </div>
        </>
      )}
      </Card>

      <Card className="space-y-4 p-4">
        <h2 className="text-base font-semibold text-text">Capacity</h2>

        <div>
          <label htmlFor="capacity" className={labelClass}>
            Max people (optional)
          </label>
          <Input
            id="capacity"
            name="capacity"
            type="number"
            min="1"
            step="1"
            inputMode="numeric"
            placeholder="No limit"
            defaultValue={initialValues?.capacity ?? ""}
          />
        </div>
      </Card>

      {isEditing && hasSeries && (
        <Card className="p-4">
        <fieldset className="space-y-2">
          <legend className="text-sm text-muted">Apply changes to</legend>

          <div className="space-y-1">
            {SERIES_SCOPE_OPTIONS.map((option) => (
              <label
                key={option.value}
                className="flex min-h-11 cursor-pointer items-center gap-2 text-sm text-text"
              >
                <input
                  type="radio"
                  name="scope"
                  value={option.value}
                  defaultChecked={option.value === "only"}
                  className="h-4 w-4 accent-primary"
                />
                {option.label}
              </label>
            ))}
          </div>

          <p className="text-sm text-muted">
            Date and time only change when you choose Only this event.
          </p>
        </fieldset>
        </Card>
      )}

      {!pollOpen && isPastDate && (
        <p className="text-sm text-muted">
          This date is in the past. You can still save it.
        </p>
      )}

      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}

      <div className="pt-1 flex flex-col sm:flex-row gap-3">
        <Button
          type="submit"
          disabled={busy}
          className="w-full sm:w-auto"
        >
          {pending
            ? isEditing
              ? "Saving..."
              : "Creating..."
            : isEditing
            ? "Save changes"
            : "Create event"}
        </Button>

        <Link
          href={cancelHref}
          aria-disabled={busy}
          onClick={(event) => {
            if (busy) {
              event.preventDefault();
            }
          }}
          className={buttonStyles({
            variant: "secondary",
            className: `w-full sm:w-auto ${
              busy ? "pointer-events-none opacity-40" : ""
            }`,
          })}
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
