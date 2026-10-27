"use server";

import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { POSTS_BUCKET } from "@/lib/posts";

export type OnThisDayRange = {
  year: number;
  start: string;
  end: string;
};

type OnThisDayPost = {
  id: string;
  imageUrl: string | null;
  caption: string | null;
};

type OnThisDayEvent = {
  id: string;
  title: string;
};

export type OnThisDayYear = {
  year: number;
  posts: OnThisDayPost[];
  events: OnThisDayEvent[];
};

const MAX_YEARS = 5;
const SIGNED_URL_SECONDS = 60 * 60;

function isValidRange(range: OnThisDayRange) {
  const start = new Date(range.start).getTime();
  const end = new Date(range.end).getTime();

  return (
    Number.isInteger(range.year) &&
    !Number.isNaN(start) &&
    !Number.isNaN(end) &&
    end > start
  );
}

export async function loadOnThisDayAction(
  ranges: OnThisDayRange[]
): Promise<OnThisDayYear[]> {
  if (!isSupabaseConfigured() || !Array.isArray(ranges)) {
    return [];
  }

  const validRanges = ranges.filter(isValidRange).slice(0, MAX_YEARS);

  if (validRanges.length === 0) {
    return [];
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return [];
  }

  const { data: rsvpData } = await supabase
    .from("rsvps")
    .select("event_id")
    .eq("user_id", user.id)
    .eq("status", "going");

  const goingEventIds = [
    ...new Set(
      ((rsvpData ?? []) as { event_id: string }[]).map((row) => row.event_id)
    ),
  ];

  const yearResults = await Promise.all(
    validRanges.map(async (range) => {
      const [postsResult, eventsResult] = await Promise.all([
        supabase
          .from("posts")
          .select("id,image_path,caption,created_at")
          .eq("user_id", user.id)
          .gte("created_at", range.start)
          .lt("created_at", range.end)
          .order("created_at", { ascending: true }),
        goingEventIds.length > 0
          ? supabase
              .from("events")
              .select("id,title,starts_at")
              .in("id", goingEventIds)
              .gte("starts_at", range.start)
              .lt("starts_at", range.end)
              .order("starts_at", { ascending: true })
          : Promise.resolve({ data: [], error: null }),
      ]);

      return {
        year: range.year,
        postRows: postsResult.error
          ? []
          : ((postsResult.data ?? []) as {
              id: string;
              image_path: string;
              caption: string | null;
            }[]),
        eventRows: eventsResult.error
          ? []
          : ((eventsResult.data ?? []) as { id: string; title: string }[]),
      };
    })
  );

  const imagePaths = yearResults.flatMap((result) =>
    result.postRows.map((post) => post.image_path)
  );
  const signedByPath = new Map<string, string>();

  if (imagePaths.length > 0) {
    const { data } = await supabase.storage
      .from(POSTS_BUCKET)
      .createSignedUrls(imagePaths, SIGNED_URL_SECONDS);

    for (const item of (data ?? []) as {
      path: string | null;
      signedUrl: string;
    }[]) {
      if (item.path && item.signedUrl) {
        signedByPath.set(item.path, item.signedUrl);
      }
    }
  }

  return yearResults
    .map((result) => ({
      year: result.year,
      posts: result.postRows.map((post) => ({
        id: post.id,
        imageUrl: signedByPath.get(post.image_path) ?? null,
        caption: post.caption,
      })),
      events: result.eventRows.map((event) => ({
        id: event.id,
        title: event.title,
      })),
    }))
    .filter((year) => year.posts.length > 0 || year.events.length > 0)
    .sort((a, b) => b.year - a.year);
}
