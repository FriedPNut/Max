import type { createClient } from "@/lib/supabase/server";
import { resolveProfileAvatarUrls } from "@/lib/profile-data";
import {
  POSTS_BUCKET,
  POSTS_PAGE_SIZE,
  nameInitial,
  profileName,
  relativeTime,
  type FeedPost,
  type PostPageResult,
  type PostProfile,
  type PostRecord,
} from "@/lib/posts";

type ServerClient = Awaited<ReturnType<typeof createClient>>;

type LikeRow = {
  post_id: string;
  user_id: string;
};

type SignedUrlRow = {
  path: string;
  signedUrl: string;
  error: string | null;
};

const SIGNED_URL_SECONDS = 60 * 60 * 24;

export async function loadPostPage(
  supabase: ServerClient,
  currentUserId: string,
  currentDisplayName: string,
  offset: number
): Promise<PostPageResult> {
  const safeOffset =
    Number.isInteger(offset) && offset >= 0 ? offset : 0;

  const { data: postData, error: postError } = await supabase
    .from("posts")
    .select("id,user_id,image_path,caption,created_at,event_id")
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .range(safeOffset, safeOffset + POSTS_PAGE_SIZE);

  if (postError) {
    return {
      posts: [],
      hasMore: false,
      error: "Couldn't load posts. Refresh and try again.",
    };
  }

  const rows = (postData ?? []) as PostRecord[];
  const hasMore = rows.length > POSTS_PAGE_SIZE;
  const pageRows = rows.slice(0, POSTS_PAGE_SIZE);

  if (pageRows.length === 0) {
    return { posts: [], hasMore: false };
  }

  const postIds = pageRows.map((post) => post.id);
  const authorIds = [...new Set(pageRows.map((post) => post.user_id))];
  const linkedEventIds = [...new Set(pageRows.map((post) => post.event_id).filter((id): id is string => Boolean(id)))];

  const [profilesResult, likesResult, eventsResult] = await Promise.all([
    supabase
      .from("profiles")
      .select("id,display_name,avatar_url,username")
      .in("id", authorIds),
    supabase
      .from("post_likes")
      .select("post_id,user_id")
      .in("post_id", postIds),
    linkedEventIds.length > 0
      ? supabase.from("events").select("id,title").in("id", linkedEventIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (profilesResult.error || likesResult.error || eventsResult.error) {
    return {
      posts: [],
      hasMore: false,
      error: "Couldn't load posts. Refresh and try again.",
    };
  }

  const profiles = (profilesResult.data ?? []) as PostProfile[];
  const likes = (likesResult.data ?? []) as LikeRow[];
  const profilesById = new Map(
    profiles.map((profile) => [profile.id, profile])
  );
  const eventTitles = new Map(
    ((eventsResult.data ?? []) as { id: string; title: string }[]).map((event) => [event.id, event.title])
  );
  const avatarUrls = await resolveProfileAvatarUrls(supabase, profiles);

  const likeCounts = new Map<string, number>();
  const likedByMe = new Set<string>();

  for (const like of likes) {
    likeCounts.set(like.post_id, (likeCounts.get(like.post_id) ?? 0) + 1);

    if (like.user_id === currentUserId) {
      likedByMe.add(like.post_id);
    }
  }

  const paths = pageRows.map((post) => post.image_path);
  const { data: signedData, error: signedError } = await supabase.storage
    .from(POSTS_BUCKET)
    .createSignedUrls(paths, SIGNED_URL_SECONDS);

  if (signedError) {
    return {
      posts: [],
      hasMore: false,
      error: "Couldn't load photos. Refresh and try again.",
    };
  }

  const signedByPath = new Map<string, string>();

  for (const item of (signedData ?? []) as SignedUrlRow[]) {
    if (item.signedUrl) {
      signedByPath.set(item.path, item.signedUrl);
    }
  }

  const now = Date.now();
  const posts: FeedPost[] = pageRows.map((post) => {
    const profile = profilesById.get(post.user_id);
    const name = profileName(
      profile,
      post.user_id === currentUserId ? currentDisplayName : "A friend"
    );

    return {
      id: post.id,
      imageUrl: signedByPath.get(post.image_path) ?? null,
      caption: post.caption,
      createdAt: post.created_at,
      relativeTime: relativeTime(post.created_at, now),
      authorName: name,
      authorInitial: nameInitial(name),
      authorUsername: profile?.username?.trim() || null,
      authorAvatarUrl: avatarUrls.get(post.user_id) ?? null,
      likeCount: likeCounts.get(post.id) ?? 0,
      hasLiked: likedByMe.has(post.id),
      isOwner: post.user_id === currentUserId,
      eventId: post.event_id ?? null,
      eventTitle: post.event_id ? eventTitles.get(post.event_id) ?? null : null,
    };
  });

  return { posts, hasMore };
}
