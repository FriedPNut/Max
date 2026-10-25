import type { createClient } from "@/lib/supabase/server";
import {
  BEST_OF_BUCKET,
  BEST_OF_SIGNED_URL_SECONDS,
  currentMonthKey,
  formatClosesLabel,
  formatMonthLabel,
  monthRangeFor,
  parseMonthKey,
  sortBestOf,
  type BestOfMonth,
  type BestOfPost,
} from "@/lib/best-of";

type ServerClient = Awaited<ReturnType<typeof createClient>>;

type PostRow = {
  id: string;
  user_id: string;
  image_path: string | null;
  caption: string | null;
  created_at: string;
};

type VoteRow = { post_id: string; voter_id: string; created_at: string };
type ImageRow = { post_id: string; image_path: string };
type ProfileRow = {
  id: string;
  display_name: string | null;
  username: string | null;
};

function personName(
  profile: ProfileRow | undefined,
  fallback: string
) {
  return profile?.display_name?.trim() || profile?.username?.trim() || fallback;
}

export async function loadBestOfMonth(
  supabase: ServerClient,
  {
    userId,
    displayName,
    timeZone,
    monthKey,
  }: {
    userId: string;
    displayName: string;
    timeZone: string;
    monthKey: string;
  }
): Promise<{ data?: BestOfMonth; error?: string }> {
  if (!parseMonthKey(monthKey)) {
    return { error: "That month doesn't look right." };
  }

  const range = monthRangeFor(monthKey, timeZone);

  const [postsResult, votesResult] = await Promise.all([
    supabase
      .from("posts")
      .select("id,user_id,image_path,caption,created_at")
      .gte("created_at", range.startIso)
      .lt("created_at", range.endIso)
      .order("created_at", { ascending: true }),
    supabase
      .from("best_photo_votes")
      .select("post_id,voter_id,created_at")
      .eq("month", `${monthKey}-01`),
  ]);

  if (postsResult.error || votesResult.error) {
    return { error: "Couldn't load this month. Refresh and try again." };
  }

  const postRows = (postsResult.data ?? []) as PostRow[];
  const votes = (votesResult.data ?? []) as VoteRow[];
  const base: BestOfMonth = {
    monthKey,
    monthLabel: formatMonthLabel(monthKey),
    closesLabel: formatClosesLabel(range.lastDayKey),
    lastDayKey: range.lastDayKey,
    isCurrentMonth: monthKey === currentMonthKey(timeZone),
    posts: [],
    topThree: [],
    totalVotes: 0,
    hasMyPost: false,
  };

  if (postRows.length === 0) {
    return { data: base };
  }

  const postIds = postRows.map((post) => post.id);

  // Extra images and author names for the month's posts.
  const [imagesResult, profilesResult] = await Promise.all([
    supabase
      .from("post_images")
      .select("post_id,image_path")
      .in("post_id", postIds)
      .order("created_at", { ascending: true }),
    supabase
      .from("profiles")
      .select("id,display_name,username")
      .in("id", [...new Set(postRows.map((post) => post.user_id))]),
  ]);

  if (imagesResult.error || profilesResult.error) {
    return { error: "Couldn't load this month. Refresh and try again." };
  }

  const extraImageByPost = new Map<string, string>();

  for (const row of (imagesResult.data ?? []) as ImageRow[]) {
    if (!extraImageByPost.has(row.post_id)) {
      extraImageByPost.set(row.post_id, row.image_path);
    }
  }

  // Only posts with at least one image, per the brief.
  const visible = postRows.filter(
    (post) => Boolean(post.image_path) || extraImageByPost.has(post.id)
  );
  const imagePathByPost = new Map<string, string>();

  for (const post of visible) {
    const path = post.image_path ?? extraImageByPost.get(post.id);

    if (path) {
      imagePathByPost.set(post.id, path);
    }
  }

  const paths = [...new Set(imagePathByPost.values())];
  const signedByPath = new Map<string, string>();

  if (paths.length > 0) {
    const { data: signed, error: signedError } = await supabase.storage
      .from(BEST_OF_BUCKET)
      .createSignedUrls(paths, BEST_OF_SIGNED_URL_SECONDS);

    if (signedError) {
      return { error: "Couldn't load photos. Refresh and try again." };
    }

    // One batch covers every tile and the result page.
    for (const item of (signed ?? []) as { path: string; signedUrl: string | null }[]) {
      if (item.signedUrl) {
        signedByPath.set(item.path, item.signedUrl);
      }
    }
  }

  const votesByPost = new Map<string, { count: number; first: string }>();

  for (const vote of votes) {
    const existing = votesByPost.get(vote.post_id);

    if (existing) {
      existing.count += 1;

      if (vote.created_at < existing.first) {
        existing.first = vote.created_at;
      }
    } else {
      votesByPost.set(vote.post_id, { count: 1, first: vote.created_at });
    }
  }

  const myVotePostId =
    votes.find((vote) => vote.voter_id === userId)?.post_id ?? null;
  const profilesById = new Map(
    ((profilesResult.data ?? []) as ProfileRow[]).map((profile) => [profile.id, profile])
  );

  const posts: BestOfPost[] = visible.map((post) => {
    const tally = votesByPost.get(post.id);
    const path = imagePathByPost.get(post.id);

    return {
      id: post.id,
      caption: post.caption,
      imageUrl: path ? signedByPath.get(path) ?? null : null,
      authorName: personName(
        profilesById.get(post.user_id),
        post.user_id === userId ? displayName : "A friend"
      ),
      authorUsername:
        profilesById.get(post.user_id)?.username?.trim() || null,
      createdAt: post.created_at,
      voteCount: tally?.count ?? 0,
      firstVoteAt: tally?.first ?? null,
      isMine: post.user_id === userId,
      hasMyVote: myVotePostId === post.id,
    };
  });

  const sorted = sortBestOf(posts);

  return {
    data: {
      ...base,
      posts: sorted,
      topThree: sorted.filter((post) => post.voteCount > 0).slice(0, 3),
      totalVotes: sorted.reduce((sum, post) => sum + post.voteCount, 0),
      hasMyPost: posts.some((post) => post.isMine),
    },
  };
}
