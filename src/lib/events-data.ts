import type { createClient } from "@/lib/supabase/server";
import { photoUrls } from "@/lib/photo-urls";
import { uniqueIdeaIds, type IdeaCard } from "@/lib/ideas";
import {
  EVENT_SIGNED_URL_SECONDS,
  EVENTS_BUCKET,
  type EventListItem,
  type EventRecord,
  type IdeaListItem,
  type IdeaRecord,
  type IdeaStatus,
  type IdeaVoteRecord,
} from "@/lib/events";

type ServerClient = Awaited<ReturnType<typeof createClient>>;

const EVENT_COLUMNS =
  "id,title,description,location,starts_at,created_by,created_at,cover_path,capacity,recurrence,series_id,poll_open";
const IDEA_COLUMNS =
  "id,title,description,created_by,status,event_id,created_at";

type GoingRow = {
  event_id: string;
};

type CreatorProfile = {
  id: string;
  display_name: string | null;
  username: string | null;
};

export type EventListResult = {
  items: EventListItem[];
  error?: string;
};

export type IdeaListResult = {
  items: IdeaListItem[];
  error?: string;
};

export async function loadEventListItems(
  supabase: ServerClient
): Promise<EventListResult> {
  const { data, error } = await supabase
    .from("events")
    .select(EVENT_COLUMNS)
    .order("starts_at", { ascending: true });

  if (error) {
    return { items: [], error: "Couldn't load events. Refresh and try again." };
  }

  const events = (data ?? []) as EventRecord[];
  const eventIds = events.map((event) => event.id);
  let goingRows: GoingRow[] = [];

  if (eventIds.length > 0) {
    const { data: goingData, error: goingError } = await supabase
      .from("rsvps")
      .select("event_id")
      .in("event_id", eventIds)
      .eq("status", "going");

    if (goingError) {
      return {
        items: [],
        error: "Couldn't load events. Refresh and try again.",
      };
    }

    goingRows = (goingData ?? []) as GoingRow[];
  }

  const goingCounts = new Map<string, number>();

  for (const row of goingRows) {
    goingCounts.set(row.event_id, (goingCounts.get(row.event_id) ?? 0) + 1);
  }

  const coverPaths = [
    ...new Set(
      events
        .map((event) => event.cover_path)
        .filter((path): path is string => Boolean(path))
    ),
  ];
  const coverUrls = new Map<string, string>();

  if (coverPaths.length > 0) {
    const resolved = await photoUrls(
      supabase,
      EVENTS_BUCKET,
      coverPaths,
      EVENT_SIGNED_URL_SECONDS
    );
    resolved.urls.forEach((url, path) => coverUrls.set(path, url));
  }

  return {
    items: events.map((event) => ({
      ...event,
      goingCount: goingCounts.get(event.id) ?? 0,
      coverUrl: event.cover_path
        ? coverUrls.get(event.cover_path) ?? null
        : null,
    })),
  };
}

/**
 * The card shown in a chat: no creator name, but the live vote state and
 * whether the idea has already become an event.
 */
export async function loadIdeaCards(
  supabase: ServerClient,
  currentUserId: string,
  ideaIds: readonly unknown[]
): Promise<{ cards: IdeaCard[]; missingIds: string[]; error?: string }> {
  const ids = uniqueIdeaIds(ideaIds);

  if (ids.length === 0) {
    return { cards: [], missingIds: [] };
  }

  const [ideasResult, votesResult] = await Promise.all([
    supabase
      .from("event_ideas")
      .select("id,title,description,created_by,status,event_id")
      .in("id", ids),
    supabase.from("idea_votes").select("idea_id,user_id").in("idea_id", ids),
  ]);

  if (ideasResult.error || votesResult.error) {
    return {
      cards: [],
      missingIds: [],
      error: "Couldn't load ideas. Refresh and try again.",
    };
  }

  const rows = (ideasResult.data ?? []) as {
    id: string;
    title: string;
    description: string | null;
    created_by: string;
    status: string;
    event_id: string | null;
  }[];
  const found = new Set(rows.map((row) => row.id));
  const voteCounts = new Map<string, number>();
  const votedIds = new Set<string>();

  for (const vote of (votesResult.data ?? []) as IdeaVoteRecord[]) {
    voteCounts.set(vote.idea_id, (voteCounts.get(vote.idea_id) ?? 0) + 1);

    if (vote.user_id === currentUserId) {
      votedIds.add(vote.idea_id);
    }
  }

  return {
    cards: rows.map((row) => ({
      id: row.id,
      title: row.title,
      description: row.description,
      status: row.status as IdeaStatus,
      eventId: row.event_id,
      voteCount: voteCounts.get(row.id) ?? 0,
      hasVoted: votedIds.has(row.id),
      isCreator: row.created_by === currentUserId,
    })),
    missingIds: ids.filter((id) => !found.has(id)),
  };
}

export async function loadIdeaListItems(
  supabase: ServerClient,
  currentUserId: string,
  statuses: IdeaStatus[],
  currentUserName?: string
): Promise<IdeaListResult> {
  if (statuses.length === 0) {
    return { items: [] };
  }

  const { data, error } = await supabase
    .from("event_ideas")
    .select(IDEA_COLUMNS)
    .in("status", statuses)
    .order("created_at", { ascending: false });

  if (error) {
    return { items: [], error: "Couldn't load ideas. Refresh and try again." };
  }

  const ideas = (data ?? []) as IdeaRecord[];

  if (ideas.length === 0) {
    return { items: [] };
  }

  const ideaIds = ideas.map((idea) => idea.id);
  const creatorIds = [...new Set(ideas.map((idea) => idea.created_by))];

  const [votesResult, creatorsResult] = await Promise.all([
    supabase
      .from("idea_votes")
      .select("idea_id,user_id")
      .in("idea_id", ideaIds),
    supabase
      .from("profiles")
      .select("id,display_name,username")
      .in("id", creatorIds),
  ]);

  if (votesResult.error || creatorsResult.error) {
    return { items: [], error: "Couldn't load ideas. Refresh and try again." };
  }

  const voteRows = (votesResult.data ?? []) as IdeaVoteRecord[];
  const creators = (creatorsResult.data ?? []) as CreatorProfile[];
  const creatorsById = new Map(
    creators.map((profile) => [profile.id, profile])
  );
  const voteCounts = new Map<string, number>();
  const votedIdeaIds = new Set<string>();

  for (const vote of voteRows) {
    voteCounts.set(vote.idea_id, (voteCounts.get(vote.idea_id) ?? 0) + 1);

    if (vote.user_id === currentUserId) {
      votedIdeaIds.add(vote.idea_id);
    }
  }

  function creatorName(creatorId: string) {
    const profile = creatorsById.get(creatorId);
    return (
      profile?.display_name?.trim() ||
      profile?.username?.trim() ||
      (creatorId === currentUserId ? currentUserName?.trim() : "") ||
      "A friend"
    );
  }

  return {
    items: ideas.map((idea) => ({
      id: idea.id,
      title: idea.title,
      description: idea.description,
      creatorName: creatorName(idea.created_by),
      status: idea.status as IdeaStatus,
      eventId: idea.event_id,
      createdAt: idea.created_at,
      voteCount: voteCounts.get(idea.id) ?? 0,
      hasVoted: votedIdeaIds.has(idea.id),
      isCreator: idea.created_by === currentUserId,
    })),
  };
}
