import type { createClient } from "@/lib/supabase/server";
import { POSTS_BUCKET } from "@/lib/posts";
import {
  WEEKDAY_LABELS,
  currentWeekStartKey,
  formatWeekRange,
  monthIndex,
  monthLabel,
  weekdayOfKey,
  weekRangeFor,
  zonedDateKey,
  zonedStartOfDay,
  type RecapNextEvent,
  type RecapTopPost,
  type RecapWeek,
  type WrappedCard,
  type WrappedYear,
} from "@/lib/recap";

type ServerClient = Awaited<ReturnType<typeof createClient>>;

type EventRow = {
  id: string;
  title: string;
  location: string;
  starts_at: string;
};
type RsvpRow = { event_id: string; events: unknown };
type PostRow = {
  id: string;
  user_id?: string;
  image_path: string | null;
  caption: string | null;
};
type ProfileRow = {
  id: string;
  display_name: string | null;
  username: string | null;
};

const SIGNED_URL_SECONDS = 60 * 60 * 6;
const DAY_MS = 24 * 60 * 60 * 1000;

function firstEvent(value: unknown): EventRow | null {
  if (Array.isArray(value)) {
    return (value[0] ?? null) as EventRow | null;
  }

  return (value ?? null) as EventRow | null;
}

function personName(profile: ProfileRow | undefined, fallback = "A friend") {
  return profile?.display_name?.trim() || profile?.username?.trim() || fallback;
}

async function signedImageUrl(supabase: ServerClient, path: string | null) {
  if (!path) {
    return null;
  }

  const { data } = await supabase.storage
    .from(POSTS_BUCKET)
    .createSignedUrl(path, SIGNED_URL_SECONDS);

  return data?.signedUrl ?? null;
}

function mostCommon(values: string[]) {
  const counts = new Map<string, number>();

  for (const value of values) {
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }

  let best: { value: string; count: number } | null = null;

  for (const [value, count] of counts) {
    if (!best || count > best.count) {
      best = { value, count };
    }
  }

  return best;
}

export async function loadRecapWeek(
  supabase: ServerClient,
  {
    userId,
    displayName,
    timeZone,
    weekStartKey,
  }: {
    userId: string;
    displayName: string;
    timeZone: string;
    weekStartKey: string;
  }
): Promise<{ data?: RecapWeek; error?: string }> {
  const range = weekRangeFor(weekStartKey, timeZone);
  const isCurrentWeek =
    range.weekStartKey === currentWeekStartKey(timeZone);
  const now = new Date();
  const nowIso = now.toISOString();
  const nextSevenIso = new Date(now.getTime() + 7 * DAY_MS).toISOString();
  const friendshipFilter = `requester_id.eq.${userId},addressee_id.eq.${userId}`;

  // Round 1: everything that does not depend on the friend list.
  const [friendships, myPosts, messages, newFriends, attended, upcoming] =
    await Promise.all([
      supabase
        .from("friendships")
        .select("requester_id,addressee_id")
        .eq("status", "accepted")
        .or(friendshipFilter),
      supabase
        .from("posts")
        .select("id,image_path,caption")
        .eq("user_id", userId)
        .gte("created_at", range.startIso)
        .lt("created_at", range.endIso),
      supabase
        .from("messages")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .gte("created_at", range.startIso)
        .lt("created_at", range.endIso),
      supabase
        .from("friendships")
        .select("id", { count: "exact", head: true })
        .eq("status", "accepted")
        .gte("created_at", range.startIso)
        .lt("created_at", range.endIso)
        .or(friendshipFilter),
      supabase
        .from("rsvps")
        .select("event_id, events!inner(id,title,location,starts_at)")
        .eq("user_id", userId)
        .eq("status", "going")
        .gte("events.starts_at", range.startIso)
        .lt("events.starts_at", range.endIso),
      supabase
        .from("rsvps")
        .select("event_id, events!inner(id,title,location,starts_at)")
        .eq("user_id", userId)
        .in("status", ["going", "maybe"])
        .gte("events.starts_at", nowIso)
        .lt("events.starts_at", nextSevenIso),
    ]);

  if (
    friendships.error ||
    myPosts.error ||
    messages.error ||
    newFriends.error ||
    attended.error ||
    upcoming.error
  ) {
    return { error: "Couldn't load your week. Refresh and try again." };
  }

  const friendIds = [
    ...new Set(
      ((friendships.data ?? []) as { requester_id: string; addressee_id: string }[]).map(
        (row) => (row.requester_id === userId ? row.addressee_id : row.requester_id)
      )
    ),
  ];
  const groupIds = [userId, ...friendIds];
  const myPostRows = (myPosts.data ?? []) as PostRow[];
  const myPostIds = myPostRows.map((post) => post.id);
  const attendedEvents = ((attended.data ?? []) as RsvpRow[])
    .map((row) => firstEvent(row.events))
    .filter((event): event is EventRow => Boolean(event));

  // Round 2: group events and the group's posts for the week.
  const [newEvents, groupPosts] = await Promise.all([
    supabase
      .from("events")
      .select("id", { count: "exact", head: true })
      .gte("created_at", range.startIso)
      .lt("created_at", range.endIso)
      .in("created_by", groupIds),
    supabase
      .from("posts")
      .select("id,user_id,image_path,caption,created_at")
      .in("user_id", groupIds)
      .gte("created_at", range.startIso)
      .lt("created_at", range.endIso)
      .order("created_at", { ascending: false })
      .limit(200),
  ]);

  if (newEvents.error || groupPosts.error) {
    return { error: "Couldn't load your week. Refresh and try again." };
  }

  const groupPostRows = (groupPosts.data ?? []) as (PostRow & { created_at: string })[];
  const groupPostIds = groupPostRows.map((post) => post.id);

  // Round 3: likes on those posts, plus any extra images on my own posts.
  const [likes, postImages] = await Promise.all([
    groupPostIds.length > 0
      ? supabase.from("post_likes").select("post_id").in("post_id", groupPostIds)
      : Promise.resolve({ data: [], error: null }),
    myPostIds.length > 0
      ? supabase.from("post_images").select("post_id").in("post_id", myPostIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (likes.error || postImages.error) {
    return { error: "Couldn't load your week. Refresh and try again." };
  }

  const likeCounts = new Map<string, number>();

  for (const row of (likes.data ?? []) as { post_id: string }[]) {
    likeCounts.set(row.post_id, (likeCounts.get(row.post_id) ?? 0) + 1);
  }

  let topPost: RecapTopPost | null = null;
  let bestPost: (PostRow & { created_at: string }) | null = null;
  let bestLikes = 0;

  for (const post of groupPostRows) {
    const count = likeCounts.get(post.id) ?? 0;

    if (count > bestLikes) {
      bestPost = post;
      bestLikes = count;
    }
  }

  if (bestPost) {
    const [author, imageUrl] = await Promise.all([
      supabase
        .from("profiles")
        .select("id,display_name,username")
        .eq("id", bestPost.user_id ?? "")
        .maybeSingle(),
      signedImageUrl(supabase, bestPost.image_path ?? null),
    ]);

    topPost = {
      id: bestPost.id,
      caption: bestPost.caption,
      authorName: personName(
        (author.data ?? undefined) as ProfileRow | undefined,
        bestPost.user_id === userId ? displayName : "A friend"
      ),
      likeCount: bestLikes,
      imageUrl,
    };
  }

  // A post with extra images counts those; a plain post counts its one photo.
  const postsWithExtraImages = new Set(
    ((postImages.data ?? []) as { post_id: string }[]).map((row) => row.post_id)
  );
  const photos =
    ((postImages.data ?? []) as { post_id: string }[]).length +
    myPostRows.filter((post) => !postsWithExtraImages.has(post.id)).length;

  const dayCounts = new Map<number, number>();

  for (const event of attendedEvents) {
    const index = weekdayOfKey(zonedDateKey(new Date(event.starts_at), timeZone));
    dayCounts.set(index, (dayCounts.get(index) ?? 0) + 1);
  }

  let busiestDay: { label: string; count: number } | null = null;

  for (const [index, count] of [...dayCounts.entries()].sort((a, b) => a[0] - b[0])) {
    if (!busiestDay || count > busiestDay.count) {
      busiestDay = { label: WEEKDAY_LABELS[index], count };
    }
  }

  // Upcoming only makes sense on the current week, not when browsing back.
  const nextWeek: RecapNextEvent[] = [];
  const seenNext = new Set<string>();

  if (isCurrentWeek) {
    for (const row of ((upcoming.data ?? []) as RsvpRow[]).map((item) =>
      firstEvent(item.events)
    )) {
      if (!row || seenNext.has(row.id)) {
        continue;
      }

      seenNext.add(row.id);
      nextWeek.push({
        id: row.id,
        title: row.title,
        location: row.location,
        startsAt: row.starts_at,
      });
    }
  }

  nextWeek.sort((a, b) => a.startsAt.localeCompare(b.startsAt));

  const data: RecapWeek = {
    weekStartKey: range.weekStartKey,
    weekEndKey: range.weekEndKey,
    weekLabel: formatWeekRange(range.weekStartKey, range.weekEndKey),
    eventsAttended: attendedEvents.length,
    newEvents: newEvents.count ?? 0,
    posts: myPostRows.length,
    photos,
    messages: messages.count ?? 0,
    newFriends: newFriends.count ?? 0,
    topPost,
    busiestDay,
    nextWeek,
    isCurrentWeek,
    isEmpty: false,
  };

  data.isEmpty =
    data.eventsAttended === 0 &&
    data.newEvents === 0 &&
    data.posts === 0 &&
    data.messages === 0 &&
    data.newFriends === 0 &&
    !data.topPost &&
    data.nextWeek.length === 0;

  return { data };
}

export async function loadWrapped(
  supabase: ServerClient,
  {
    userId,
    displayName,
    timeZone,
    year,
  }: {
    userId: string;
    displayName: string;
    timeZone: string;
    year: number;
  }
): Promise<{ data?: WrappedYear; error?: string }> {
  const startIso = zonedStartOfDay(`${year}-01-01`, timeZone).toISOString();
  const endIso = zonedStartOfDay(`${year + 1}-01-01`, timeZone).toISOString();

  const [attended, myPosts, messages, comments] = await Promise.all([
    supabase
      .from("rsvps")
      .select("event_id, events!inner(id,title,location,starts_at)")
      .eq("user_id", userId)
      .eq("status", "going")
      .gte("events.starts_at", startIso)
      .lt("events.starts_at", endIso),
    supabase
      .from("posts")
      .select("id,image_path,caption,created_at")
      .eq("user_id", userId)
      .gte("created_at", startIso)
      .lt("created_at", endIso)
      .order("created_at", { ascending: false }),
    supabase
      .from("messages")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("created_at", startIso)
      .lt("created_at", endIso),
    supabase
      .from("post_comments")
      .select("id, posts!inner(user_id)", { count: "exact", head: true })
      .eq("posts.user_id", userId)
      .gte("created_at", startIso)
      .lt("created_at", endIso),
  ]);

  if (attended.error || myPosts.error || messages.error || comments.error) {
    return { error: "Couldn't load your year. Refresh and try again." };
  }

  const attendedEvents = ((attended.data ?? []) as RsvpRow[])
    .map((row) => firstEvent(row.events))
    .filter((event): event is EventRow => Boolean(event));
  const postRows = (myPosts.data ?? []) as PostRow[];
  const postIds = postRows.map((post) => post.id);
  const eventIds = [...new Set(attendedEvents.map((event) => event.id))];

  const [coAttendees, likes, postImages] = await Promise.all([
    eventIds.length > 0
      ? supabase
          .from("rsvps")
          .select("user_id")
          .in("event_id", eventIds)
          .eq("status", "going")
          .neq("user_id", userId)
      : Promise.resolve({ data: [], error: null }),
    postIds.length > 0
      ? supabase.from("post_likes").select("post_id").in("post_id", postIds)
      : Promise.resolve({ data: [], error: null }),
    postIds.length > 0
      ? supabase.from("post_images").select("post_id").in("post_id", postIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (coAttendees.error || likes.error || postImages.error) {
    return { error: "Couldn't load your year. Refresh and try again." };
  }

  // Busiest month, by events attended.
  const monthCounts = new Map<number, number>();

  for (const event of attendedEvents) {
    const index = monthIndex(event.starts_at, timeZone);
    monthCounts.set(index, (monthCounts.get(index) ?? 0) + 1);
  }

  let busiestMonth: { index: number; count: number } | null = null;

  for (const [index, count] of [...monthCounts.entries()].sort((a, b) => a[0] - b[0])) {
    if (!busiestMonth || count > busiestMonth.count) {
      busiestMonth = { index, count };
    }
  }

  // Most-visited location.
  const places = attendedEvents
    .map((event) => event.location?.trim())
    .filter((value): value is string => Boolean(value));
  const topPlace = mostCommon(places);

  // The friend I went to the most events with.
  const togetherCounts = new Map<string, number>();

  for (const row of (coAttendees.data ?? []) as { user_id: string }[]) {
    togetherCounts.set(row.user_id, (togetherCounts.get(row.user_id) ?? 0) + 1);
  }

  let bestFriendId: string | null = null;
  let bestFriendCount = 0;

  for (const [id, count] of [...togetherCounts.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    if (count > bestFriendCount) {
      bestFriendId = id;
      bestFriendCount = count;
    }
  }

  // Most-liked post of mine.
  const likeCounts = new Map<string, number>();

  for (const row of (likes.data ?? []) as { post_id: string }[]) {
    likeCounts.set(row.post_id, (likeCounts.get(row.post_id) ?? 0) + 1);
  }

  let bestPost: PostRow | null = null;
  let bestLikes = 0;

  for (const post of postRows) {
    const count = likeCounts.get(post.id) ?? 0;

    if (count > bestLikes) {
      bestPost = post;
      bestLikes = count;
    }
  }

  const [friendProfile, bestPostImage] = await Promise.all([
    bestFriendId
      ? supabase
          .from("profiles")
          .select("id,display_name,username")
          .eq("id", bestFriendId)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    signedImageUrl(supabase, bestPost?.image_path ?? null),
  ]);

  const postsWithExtraImages = new Set(
    ((postImages.data ?? []) as { post_id: string }[]).map((row) => row.post_id)
  );
  const photos =
    ((postImages.data ?? []) as { post_id: string }[]).length +
    postRows.filter((post) => !postsWithExtraImages.has(post.id)).length;

  const cards: WrappedCard[] = [];

  if (attendedEvents.length > 0) {
    cards.push({
      id: "events",
      label: "Events attended",
      value: String(attendedEvents.length),
    });
  }

  if (busiestMonth) {
    const sample = attendedEvents.find(
      (event) => monthIndex(event.starts_at, timeZone) === busiestMonth?.index
    );

    cards.push({
      id: "month",
      label: "Busiest month",
      value: sample ? monthLabel(sample.starts_at, timeZone) : "",
      detail: `${busiestMonth.count} ${
        busiestMonth.count === 1 ? "event" : "events"
      }`,
    });
  }

  if (topPlace) {
    cards.push({
      id: "place",
      label: "Most-visited spot",
      value: topPlace.value,
      detail: `${topPlace.count} ${topPlace.count === 1 ? "event" : "events"}`,
    });
  }

  if (bestFriendId) {
    cards.push({
      id: "friend",
      label: "Your go-to friend",
      value: personName((friendProfile.data ?? undefined) as ProfileRow | undefined),
      detail: `${bestFriendCount} ${
        bestFriendCount === 1 ? "event" : "events"
      } together`,
    });
  }

  if (bestPost) {
    cards.push({
      id: "post",
      label: "Most-liked post",
      value: bestPost.caption?.trim() || "Your photo",
      detail: `${bestLikes} ${bestLikes === 1 ? "like" : "likes"}`,
      imageUrl: bestPostImage,
    });
  }

  if (photos > 0) {
    cards.push({ id: "photos", label: "Photos shared", value: String(photos) });
  }

  if ((messages.count ?? 0) > 0) {
    cards.push({
      id: "messages",
      label: "Messages sent",
      value: String(messages.count),
    });
  }

  if ((comments.count ?? 0) > 0) {
    cards.push({
      id: "comments",
      label: "Comments received",
      value: String(comments.count),
    });
  }

  if (cards.length === 0) {
    cards.push({ id: "quiet", label: "Max Wrapped", value: "Nothing here yet." });
  }

  cards.push({
    id: "closing",
    label: `Max Wrapped ${year}`,
    // "That's your [year]." — the closing card.
    value: `That's your ${year}.`,
    closing: true,
  });

  return { data: { year, cards } };
}
