"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import {
  EVENTS_BUCKET,
  isDateVote,
  isEventCoverPath,
  isRecurrence,
  isRsvpChoice,
  isSeriesScope,
  type PollSnapshot,
  type Recurrence,
  type RsvpSnapshot,
  type SeriesScope,
} from "@/lib/events";
import {
  defaultUntilDateKey,
  generateOccurrenceDateKeys,
  isValidTimeZone,
  parseDateKey,
  zonedDateTimeToUtc,
} from "@/lib/recurrence";
import { loadRsvpSnapshot } from "@/lib/event-rsvps";
import { loadPollSnapshot } from "@/lib/polls";

export type EventFormState = {
  error?: string;
  /** Set when someone else scheduled the idea while this form was open. */
  conflictEventId?: string;
};

export type RsvpState = {
  error?: string;
  snapshot?: RsvpSnapshot;
};

export type DeleteEventState = {
  error?: string;
};

export type VotePollState = {
  error?: string;
  snapshot?: PollSnapshot;
};

export type PickPollTimeState = {
  error?: string;
};

type ServerClient = Awaited<ReturnType<typeof createClient>>;

type EventInput = {
  values: {
    title: string;
    description: string | null;
    location: string;
    capacity: number | null;
    cover_path: string | null;
  };
  recurrence: Recurrence;
  occurrenceStarts: string[];
  pollOpen: boolean;
  dateOptionStarts: string[];
};

async function requireUser() {
  if (!isSupabaseConfigured()) {
    redirect("/login");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return { supabase, user };
}

function readText(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function userDisplayName(user: {
  email?: string | null;
  user_metadata?: Record<string, unknown>;
}) {
  const rawName = user.user_metadata?.display_name;

  if (typeof rawName === "string" && rawName.trim()) {
    return rawName.trim();
  }

  return user.email ? user.email.split("@")[0] : "friend";
}

function buildStartsAt(dateValue: string, timeValue: string, offsetValue: string) {
  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateValue);
  const timeMatch = /^(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(timeValue);

  if (!dateMatch || !timeMatch) {
    return null;
  }

  const year = Number(dateMatch[1]);
  const month = Number(dateMatch[2]);
  const day = Number(dateMatch[3]);
  const hour = Number(timeMatch[1]);
  const minute = Number(timeMatch[2]);
  const second = Number(timeMatch[3] ?? "0");
  const rawOffset = Number(offsetValue || "0");
  const offset = Number.isFinite(rawOffset) && Math.abs(rawOffset) <= 840 ? rawOffset : 0;

  const wallClock = new Date(Date.UTC(year, month - 1, day, hour, minute, second));

  if (
    wallClock.getUTCFullYear() !== year ||
    wallClock.getUTCMonth() !== month - 1 ||
    wallClock.getUTCDate() !== day ||
    wallClock.getUTCHours() !== hour ||
    wallClock.getUTCMinutes() !== minute ||
    wallClock.getUTCSeconds() !== second
  ) {
    return null;
  }

  // getTimezoneOffset() is UTC minus local, so adding it turns the local
  // wall-clock time the user typed into the matching UTC instant.
  return new Date(wallClock.getTime() + offset * 60_000).toISOString();
}

function readEventInput(formData: FormData): EventInput | { error: string } {
  const title = readText(formData, "title");
  const description = readText(formData, "description");
  const location = readText(formData, "location");
  const capacityValue = readText(formData, "capacity");
  const coverPath = readText(formData, "cover_path");
  const timeZone = readText(formData, "timezone");
  const pollOpen = readText(formData, "poll_open") === "true";

  if (!title) {
    return { error: "Give your plan a name." };
  }

  if (!location) {
    return { error: "Where's it happening?" };
  }

  let capacity: number | null = null;

  if (capacityValue) {
    const parsedCapacity = Number(capacityValue);

    if (!Number.isInteger(parsedCapacity) || parsedCapacity < 1) {
      return { error: "Use a whole number for max people." };
    }

    capacity = parsedCapacity;
  }

  const values = {
    title,
    description: description || null,
    location,
    capacity,
    cover_path: coverPath || null,
  };

  if (pollOpen) {
    const optionDates = formData
      .getAll("option_date")
      .map((value) => String(value).trim());
    const optionTimes = formData
      .getAll("option_time")
      .map((value) => String(value).trim());

    if (
      optionDates.length < 2 ||
      optionDates.length > 6 ||
      optionDates.length !== optionTimes.length
    ) {
      return { error: "Add between 2 and 6 time options." };
    }

    if (!isValidTimeZone(timeZone)) {
      return { error: "We couldn't work out your time zone. Refresh and try again." };
    }

    const optionStarts: string[] = [];

    for (let index = 0; index < optionDates.length; index += 1) {
      const dateKey = optionDates[index];
      const timeValue = optionTimes[index];

      if (!parseDateKey(dateKey) || !timeValue) {
        return { error: "Add a date and time for each option." };
      }

      const startsAt = zonedDateTimeToUtc(dateKey, timeValue, timeZone);

      if (!startsAt) {
        return { error: "That date and time doesn't look right." };
      }

      optionStarts.push(startsAt);
    }

    const sortedOptions = [...optionStarts].sort();

    if (new Set(sortedOptions).size !== sortedOptions.length) {
      return { error: "Each time option needs to be different." };
    }

    return {
      values,
      recurrence: "none",
      occurrenceStarts: [sortedOptions[0]],
      pollOpen: true,
      dateOptionStarts: sortedOptions,
    };
  }

  const date = readText(formData, "date");
  const time = readText(formData, "time");
  const recurrenceValue = readText(formData, "recurrence") || "none";

  if (!date || !time) {
    return { error: "Pick a date and time." };
  }

  if (!parseDateKey(date)) {
    return { error: "That date and time doesn't look right." };
  }

  if (!isRecurrence(recurrenceValue)) {
    return { error: "Pick a repeat option." };
  }

  let until = readText(formData, "until");

  if (recurrenceValue !== "none") {
    if (!until) {
      until = defaultUntilDateKey(date);
    }

    if (!parseDateKey(until)) {
      return { error: "Pick a valid end date for the repeat." };
    }

    if (until < date) {
      return { error: "The repeat can't end before it starts." };
    }
  }

  const occurrenceDateKeys =
    recurrenceValue === "none"
      ? [date]
      : generateOccurrenceDateKeys(date, until, recurrenceValue);

  if (occurrenceDateKeys.length === 0) {
    return { error: "That repeat doesn't have any events. Pick another end date." };
  }

  const occurrenceStarts: string[] = [];

  if (isValidTimeZone(timeZone)) {
    for (const dateKey of occurrenceDateKeys) {
      const startsAt = zonedDateTimeToUtc(dateKey, time, timeZone);

      if (!startsAt) {
        return { error: "That date and time doesn't look right." };
      }

      occurrenceStarts.push(startsAt);
    }
  } else if (recurrenceValue !== "none") {
    return { error: "We couldn't work out your time zone. Refresh and try again." };
  } else {
    const submittedStartsAt = readText(formData, "starts_at");
    const parsedStartsAt = submittedStartsAt
      ? new Date(submittedStartsAt)
      : null;
    const startsAt =
      parsedStartsAt && !Number.isNaN(parsedStartsAt.getTime())
        ? parsedStartsAt.toISOString()
        : buildStartsAt(date, time, readText(formData, "timezone_offset"));

    if (!startsAt) {
      return { error: "That date and time doesn't look right." };
    }

    occurrenceStarts.push(startsAt);
  }

  return {
    values,
    recurrence: recurrenceValue,
    occurrenceStarts,
    pollOpen: false,
    dateOptionStarts: [],
  };
}

async function removeCoverIfUnused(
  supabase: ServerClient,
  path: string,
  userId: string
) {
  if (!isEventCoverPath(path, userId)) {
    return;
  }

  const { data, error } = await supabase
    .from("events")
    .select("id")
    .eq("cover_path", path)
    .limit(1);

  if (error || !data || data.length > 0) {
    return;
  }

  await supabase.storage.from(EVENTS_BUCKET).remove([path]);
}

async function discardCreatedEvents(
  supabase: ServerClient,
  eventIds: string[],
  firstEventId: string,
  coverPath: string | null
) {
  await supabase.from("date_options").delete().eq("event_id", firstEventId);
  await supabase.from("events").delete().in("id", eventIds);

  if (coverPath) {
    await supabase.storage.from(EVENTS_BUCKET).remove([coverPath]);
  }
}

export async function createEventAction(
  _prevState: EventFormState,
  formData: FormData
): Promise<EventFormState> {
  const input = readEventInput(formData);

  if ("error" in input) {
    return input;
  }

  const ideaId = readText(formData, "idea_id");
  const { supabase, user } = await requireUser();

  if (
    input.values.cover_path &&
    !isEventCoverPath(input.values.cover_path, user.id)
  ) {
    return { error: "That cover didn't upload right. Try again." };
  }

  if (ideaId) {
    // Any signed-in user may turn an open idea into an event; the idea itself
    // stays the only source of truth for whether that already happened.
    const { data: idea, error: ideaError } = await supabase
      .from("event_ideas")
      .select("id,status,event_id")
      .eq("id", ideaId)
      .maybeSingle();

    if (ideaError) {
      if (input.values.cover_path) {
        await supabase.storage
          .from(EVENTS_BUCKET)
          .remove([input.values.cover_path]);
      }

      return { error: "Couldn't check that idea. Try again." };
    }

    if (!idea) {
      if (input.values.cover_path) {
        await supabase.storage
          .from(EVENTS_BUCKET)
          .remove([input.values.cover_path]);
      }

      return { error: "This idea was removed." };
    }

    if (idea.status !== "open") {
      if (input.values.cover_path) {
        await supabase.storage
          .from(EVENTS_BUCKET)
          .remove([input.values.cover_path]);
      }

      return {
        error: "Someone just made this an event.",
        conflictEventId: (idea.event_id as string | null) ?? undefined,
      };
    }
  }

  const seriesId =
    input.pollOpen || input.recurrence === "none" ? null : randomUUID();
  const rows = input.occurrenceStarts.map((startsAt) => ({
    ...input.values,
    starts_at: startsAt,
    recurrence: input.recurrence,
    series_id: seriesId,
    poll_open: input.pollOpen,
    created_by: user.id,
  }));

  const { data, error } = await supabase
    .from("events")
    .insert(rows)
    .select("id,starts_at");

  if (error || !data || data.length === 0) {
    if (input.values.cover_path) {
      await supabase.storage
        .from(EVENTS_BUCKET)
        .remove([input.values.cover_path]);
    }

    return { error: "Couldn't save that event. Try again." };
  }

  const sorted = [...data].sort(
    (a, b) =>
      new Date(a.starts_at as string).getTime() -
      new Date(b.starts_at as string).getTime()
  );
  const firstEvent = sorted[0];
  const eventIds = data.map((row) => row.id as string);

  if (input.pollOpen) {
    const { error: optionsError } = await supabase
      .from("date_options")
      .insert(
        input.dateOptionStarts.map((startsAt) => ({
          event_id: firstEvent.id,
          starts_at: startsAt,
        }))
      );

    if (optionsError) {
      await discardCreatedEvents(
        supabase,
        eventIds,
        firstEvent.id as string,
        input.values.cover_path
      );

      return { error: "Couldn't save those times. Try again." };
    }
  }

  if (ideaId) {
    // Only the first writer wins: the new event is kept only if this update
    // actually moved the idea out of "open".
    const { data: scheduled, error: scheduleError } = await supabase
      .from("event_ideas")
      .update({ status: "scheduled", event_id: firstEvent.id })
      .eq("id", ideaId)
      .eq("status", "open")
      .select("id");

    if (scheduleError) {
      await discardCreatedEvents(
        supabase,
        eventIds,
        firstEvent.id as string,
        input.values.cover_path
      );

      return { error: "Couldn't schedule that idea. Try again." };
    }

    if (!scheduled || scheduled.length === 0) {
      // Someone else scheduled it first: drop our duplicate event and point at
      // the event that won instead of leaving two of them behind.
      await discardCreatedEvents(
        supabase,
        eventIds,
        firstEvent.id as string,
        input.values.cover_path
      );

      const { data: settled } = await supabase
        .from("event_ideas")
        .select("event_id")
        .eq("id", ideaId)
        .maybeSingle();

      return {
        error: "Someone just made this an event.",
        conflictEventId:
          (settled?.event_id as string | null) ?? undefined,
      };
    }
  }

  revalidatePath("/events");
  revalidatePath("/events/ideas");
  redirect(`/events/${firstEvent.id}`);
}

export async function updateEventAction(
  eventId: string,
  _prevState: EventFormState,
  formData: FormData
): Promise<EventFormState> {
  const input = readEventInput(formData);

  if ("error" in input) {
    return input;
  }

  if (input.pollOpen) {
    return { error: "Time polls can only be set when creating an event." };
  }

  const scopeValue = readText(formData, "scope") || "only";

  if (!isSeriesScope(scopeValue)) {
    return { error: "We couldn't tell which events to change. Try again." };
  }

  const { supabase, user } = await requireUser();

  if (
    input.values.cover_path &&
    !isEventCoverPath(input.values.cover_path, user.id)
  ) {
    return { error: "That cover didn't upload right. Try again." };
  }

  const { data: existingEvent, error: existingError } = await supabase
    .from("events")
    .select("id,series_id,starts_at,cover_path")
    .eq("id", eventId)
    .eq("created_by", user.id)
    .maybeSingle();

  if (existingError) {
    return { error: "Couldn't save those changes. Try again." };
  }

  if (!existingEvent) {
    return { error: "This event isn't yours to edit." };
  }

  const seriesId = existingEvent.series_id as string | null;
  const scope: SeriesScope = seriesId ? scopeValue : "only";
  let affectedRows: { id: string; cover_path: string | null }[] = [];

  if (scope === "only") {
    affectedRows = [
      {
        id: existingEvent.id as string,
        cover_path: existingEvent.cover_path as string | null,
      },
    ];
  } else {
    let rowsQuery = supabase
      .from("events")
      .select("id,cover_path,starts_at")
      .eq("series_id", seriesId as string)
      .eq("created_by", user.id);

    if (scope === "following") {
      rowsQuery = rowsQuery.gte("starts_at", existingEvent.starts_at as string);
    }

    const { data: seriesRows, error: seriesError } = await rowsQuery;

    if (seriesError || !seriesRows || seriesRows.length === 0) {
      return { error: "Couldn't save those changes. Try again." };
    }

    affectedRows = seriesRows.map((row) => ({
      id: row.id as string,
      cover_path: row.cover_path as string | null,
    }));
  }

  const updateValues =
    scope === "only"
      ? { ...input.values, starts_at: input.occurrenceStarts[0] }
      : input.values;
  const ids = affectedRows.map((row) => row.id);
  const { data: updated, error: updateError } = await supabase
    .from("events")
    .update(updateValues)
    .in("id", ids)
    .eq("created_by", user.id)
    .select("id");

  if (updateError || !updated || updated.length === 0) {
    return { error: "Couldn't save those changes. Try again." };
  }

  const oldCoverPaths = [
    ...new Set(
      affectedRows
        .map((row) => row.cover_path)
        .filter((path): path is string => Boolean(path))
    ),
  ].filter((path) => path !== input.values.cover_path);

  for (const path of oldCoverPaths) {
    await removeCoverIfUnused(supabase, path, user.id);
  }

  revalidatePath("/events");
  revalidatePath("/events/ideas");
  revalidatePath(`/events/${eventId}`);
  redirect(`/events/${eventId}`);
}

export async function setRsvpAction(
  _prevState: RsvpState,
  formData: FormData
): Promise<RsvpState> {
  const eventId = readText(formData, "event_id");
  const status = readText(formData, "status");

  if (!eventId || !isRsvpChoice(status)) {
    return { error: "We couldn't tell which answer that was. Try again." };
  }

  const { supabase, user } = await requireUser();
  const { data: event, error: eventError } = await supabase
    .from("events")
    .select("starts_at,capacity,poll_open")
    .eq("id", eventId)
    .maybeSingle();

  if (eventError || !event) {
    return { error: "Couldn't find that event. Refresh and try again." };
  }

  if (event.poll_open) {
    return { error: "RSVP opens when a time is picked." };
  }

  if (new Date(event.starts_at).getTime() < Date.now()) {
    return { error: "This event has passed." };
  }

  const { error } = await supabase.from("rsvps").upsert(
    {
      event_id: eventId,
      user_id: user.id,
      status,
    },
    { onConflict: "event_id,user_id" }
  );

  if (error) {
    return { error: "Couldn't save your answer. Try again." };
  }

  const snapshotResult = await loadRsvpSnapshot(supabase, {
    eventId,
    currentUserId: user.id,
    currentUserName: userDisplayName(user),
    capacity: (event.capacity as number | null) ?? null,
  });

  if (snapshotResult.error || !snapshotResult.snapshot) {
    return {
      error:
        snapshotResult.error ??
        "Couldn't refresh who's coming. Refresh and try again.",
    };
  }

  revalidatePath(`/events/${eventId}`);
  revalidatePath("/events");
  revalidatePath("/events/ideas");

  return { snapshot: snapshotResult.snapshot };
}

export async function voteDateOptionAction(
  _prevState: VotePollState,
  formData: FormData
): Promise<VotePollState> {
  const eventId = readText(formData, "event_id");
  const optionId = readText(formData, "option_id");
  const vote = readText(formData, "vote");

  if (!eventId || !optionId || !isDateVote(vote)) {
    return { error: "We couldn't tell which time that was. Try again." };
  }

  const { supabase, user } = await requireUser();
  const { data: event, error: eventError } = await supabase
    .from("events")
    .select("id,poll_open")
    .eq("id", eventId)
    .maybeSingle();

  if (eventError || !event) {
    return { error: "Couldn't find that poll. Refresh and try again." };
  }

  if (!event.poll_open) {
    return { error: "This poll is closed." };
  }

  const { data: option, error: optionError } = await supabase
    .from("date_options")
    .select("id,event_id")
    .eq("id", optionId)
    .eq("event_id", eventId)
    .maybeSingle();

  if (optionError || !option) {
    return { error: "Couldn't find that time option. Refresh and try again." };
  }

  const { data: existing, error: existingError } = await supabase
    .from("date_votes")
    .select("vote")
    .eq("option_id", optionId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (existingError) {
    return { error: "Couldn't save your vote. Try again." };
  }

  if (existing?.vote === vote) {
    const { error } = await supabase
      .from("date_votes")
      .delete()
      .eq("option_id", optionId)
      .eq("user_id", user.id);

    if (error) {
      return { error: "Couldn't remove your vote. Try again." };
    }
  } else if (existing) {
    const { error } = await supabase
      .from("date_votes")
      .update({ vote })
      .eq("option_id", optionId)
      .eq("user_id", user.id);

    if (error) {
      return { error: "Couldn't save your vote. Try again." };
    }
  } else {
    const { error } = await supabase.from("date_votes").insert({
      option_id: optionId,
      user_id: user.id,
      vote,
    });

    if (error) {
      return { error: "Couldn't save your vote. Try again." };
    }
  }

  const snapshotResult = await loadPollSnapshot(supabase, {
    eventId,
    currentUserId: user.id,
    currentUserName: userDisplayName(user),
  });

  if (snapshotResult.error || !snapshotResult.snapshot) {
    return {
      error:
        snapshotResult.error ?? "Couldn't refresh the votes. Refresh and try again.",
    };
  }

  revalidatePath(`/events/${eventId}`);
  revalidatePath("/events");
  revalidatePath("/events/ideas");

  return { snapshot: snapshotResult.snapshot };
}

export async function pickPollTimeAction(
  _prevState: PickPollTimeState,
  formData: FormData
): Promise<PickPollTimeState> {
  const eventId = readText(formData, "event_id");
  const optionId = readText(formData, "option_id");

  if (!eventId || !optionId) {
    return { error: "We couldn't tell which time to pick. Try again." };
  }

  const { supabase, user } = await requireUser();
  const { data: event, error: eventError } = await supabase
    .from("events")
    .select("id,created_by,poll_open")
    .eq("id", eventId)
    .maybeSingle();

  if (eventError || !event) {
    return { error: "Couldn't find that poll. Refresh and try again." };
  }

  if (event.created_by !== user.id) {
    return { error: "This poll isn't yours to pick." };
  }

  if (!event.poll_open) {
    return { error: "This poll is already closed." };
  }

  const { data: option, error: optionError } = await supabase
    .from("date_options")
    .select("id,event_id,starts_at")
    .eq("id", optionId)
    .eq("event_id", eventId)
    .maybeSingle();

  if (optionError || !option) {
    return { error: "Couldn't find that time option. Refresh and try again." };
  }

  const { data: updated, error: updateError } = await supabase
    .from("events")
    .update({
      starts_at: option.starts_at,
      poll_open: false,
    })
    .eq("id", eventId)
    .eq("created_by", user.id)
    .select("id");

  if (updateError || !updated || updated.length === 0) {
    return { error: "Couldn't pick that time. Try again." };
  }

  // The event is already closed to voting, so a failed cleanup of the unused
  // options only leaves extra rows behind; it must not hide the picked time.
  const { error: cleanupError } = await supabase
    .from("date_options")
    .delete()
    .eq("event_id", eventId)
    .neq("id", optionId);

  if (cleanupError) {
    console.error("pickPollTimeAction: couldn't clear unused poll options", cleanupError.message);
  }

  revalidatePath(`/events/${eventId}`);
  revalidatePath("/events");
  revalidatePath("/events/ideas");
  redirect(`/events/${eventId}`);
}

export async function deleteEventAction(
  _prevState: DeleteEventState,
  formData: FormData
): Promise<DeleteEventState> {
  const eventId = readText(formData, "event_id");
  const scopeValue = readText(formData, "scope") || "only";

  if (!eventId) {
    return { error: "We couldn't tell which event that was. Refresh and try again." };
  }

  if (!isSeriesScope(scopeValue)) {
    return { error: "We couldn't tell which events to delete. Try again." };
  }

  const { supabase, user } = await requireUser();
  const { data: event, error: eventError } = await supabase
    .from("events")
    .select("id,series_id,starts_at,cover_path")
    .eq("id", eventId)
    .eq("created_by", user.id)
    .maybeSingle();

  if (eventError) {
    return { error: "Couldn't delete that event. Try again." };
  }

  if (!event) {
    return { error: "That event isn't yours to delete." };
  }

  const seriesId = event.series_id as string | null;
  const scope: SeriesScope = seriesId ? scopeValue : "only";
  let rows: { id: string; cover_path: string | null }[] = [];

  if (scope === "only") {
    rows = [
      {
        id: event.id as string,
        cover_path: event.cover_path as string | null,
      },
    ];
  } else {
    let rowsQuery = supabase
      .from("events")
      .select("id,cover_path")
      .eq("series_id", seriesId as string)
      .eq("created_by", user.id);

    if (scope === "following") {
      rowsQuery = rowsQuery.gte("starts_at", event.starts_at as string);
    }

    const { data: seriesRows, error: seriesError } = await rowsQuery;

    if (seriesError || !seriesRows || seriesRows.length === 0) {
      return { error: "Couldn't delete those events. Try again." };
    }

    rows = seriesRows.map((row) => ({
      id: row.id as string,
      cover_path: row.cover_path as string | null,
    }));
  }

  const ids = rows.map((row) => row.id);
  // The database deletes the idea this event came from, so there is nothing to
  // reopen here afterwards.
  const { data: deleted, error: deleteError } = await supabase
    .from("events")
    .delete()
    .in("id", ids)
    .eq("created_by", user.id)
    .select("id");

  if (deleteError) {
    return { error: "Couldn't delete that event. Try again." };
  }

  if (!deleted || deleted.length === 0) {
    return { error: "That event isn't yours to delete." };
  }

  const coverPaths = [
    ...new Set(
      rows
        .map((row) => row.cover_path)
        .filter((path): path is string => Boolean(path))
    ),
  ];

  for (const path of coverPaths) {
    await removeCoverIfUnused(supabase, path, user.id);
  }

  revalidatePath("/events");
  revalidatePath("/events/ideas");
  redirect("/events");
}
