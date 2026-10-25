import type { createClient } from "@/lib/supabase/server";
import { resolveProfileAvatarUrls } from "@/lib/profile-data";
import { loadCommentsByPost } from "@/lib/post-comments-data";
import {
  COMMENT_PREVIEW_COUNT,
  POSTS_BUCKET,
  POSTS_PAGE_SIZE,
  nameInitial,
  profileName,
  relativeTime,
  type FeedPost,
  type PostComment,
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

type BaseFeedPost = Omit<FeedPost, "commentCount" | "previewComments">;

function buildBaseFeedPost({
  post,
  profile,
  currentUserId,
  currentDisplayName,
  imageUrl,
  authorAvatarUrl,
  likeCount,
  hasLiked,
  eventTitle,
  now,
}: {
  post: PostRecord;
  profile: PostProfile | undefined;
  currentUserId: string;
  currentDisplayName: string;
  imageUrl: string | null;
  authorAvatarUrl: string | null;
  likeCount: number;
  hasLiked: boolean;
  eventTitle: string | null;
  now: number;
}): BaseFeedPost {
  const name = profileName(
    profile,
    post.user_id === currentUserId ? currentDisplayName : "A friend"
  );

  return {
    id: post.id,
    imageUrl,
    caption: post.caption,
    createdAt: post.created_at,
    relativeTime: relativeTime(post.created_at, now),
    authorName: name,
    authorInitial: nameInitial(name),
    authorUsername: profile?.username?.trim() || null,
    authorAvatarUrl,
    likeCount,
    hasLiked,
    isOwner: post.user_id === currentUserId,
    eventId: post.event_id ?? null,
    eventTitle,
  };
}

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

  // Comments are one query for the whole page, and they can run alongside the
  // profiles, likes and linked events.
  const [profilesResult, likesResult, eventsResult, commentsResult] =
    await Promise.all([
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
      loadCommentsByPost(
        supabase,
        postIds,
        currentUserId,
        currentDisplayName,
        new Map(pageRows.map((post) => [post.id, post.user_id]))
      ),
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
  const paths = pageRows.map((post) => post.image_path);

  // Avatar URLs and post photo URLs are separate storage calls, so ask for
  // both at once instead of one after the other.
  const [avatarUrls, signedResult] = await Promise.all([
    resolveProfileAvatarUrls(supabase, profiles),
    supabase.storage.from(POSTS_BUCKET).createSignedUrls(paths, SIGNED_URL_SECONDS),
  ]);

  const likeCounts = new Map<string, number>();
  const likedByMe = new Set<string>();

  for (const like of likes) {
    likeCounts.set(like.post_id, (likeCounts.get(like.post_id) ?? 0) + 1);

    if (like.user_id === currentUserId) {
      likedByMe.add(like.post_id);
    }
  }

  const { data: signedData, error: signedError } = signedResult;

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
  const basePosts = pageRows.map((post) =>
    buildBaseFeedPost({
      post,
      profile: profilesById.get(post.user_id),
      currentUserId,
      currentDisplayName,
      imageUrl: signedByPath.get(post.image_path) ?? null,
      authorAvatarUrl: avatarUrls.get(post.user_id) ?? null,
      likeCount: likeCounts.get(post.id) ?? 0,
      hasLiked: likedByMe.has(post.id),
      eventTitle: post.event_id ? eventTitles.get(post.event_id) ?? null : null,
      now,
    })
  );

  if (commentsResult.error) {
    return { posts: [], hasMore: false, error: commentsResult.error };
  }

  const posts: FeedPost[] = basePosts.map((post) => {
    const comments = commentsResult.byPost.get(post.id) ?? [];

    return {
      ...post,
      commentCount: comments.length,
      previewComments: comments.slice(0, COMMENT_PREVIEW_COUNT).reverse(),
    };
  });

  return { posts, hasMore };
}

export type PostDetailResult =
  | { post: FeedPost; comments: PostComment[] }
  | { gone: true }
  | { error: string };

export async function loadPostDetail(
  supabase: ServerClient,
  postId: string,
  currentUserId: string,
  currentDisplayName: string
): Promise<PostDetailResult> {
  const id = String(postId ?? "").trim();

  if (!id) {
    return { gone: true };
  }

  const { data: postData, error: postError } = await supabase
    .from("posts")
    .select("id,user_id,image_path,caption,created_at,event_id")
    .eq("id", id)
    .maybeSingle();

  if (postError) {
    // A malformed id is just a post that isn't there.
    return postError.code === "22P02"
      ? { gone: true }
      : { error: "Couldn't load this post. Refresh and try again." };
  }

  if (!postData) {
    return { gone: true };
  }

  const post = postData as PostRecord;
  const [profileResult, likesResult, eventResult, commentsResult] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("id,display_name,avatar_url,username")
        .eq("id", post.user_id)
        .maybeSingle(),
      supabase.from("post_likes").select("post_id,user_id").eq("post_id", post.id),
      post.event_id
        ? supabase.from("events").select("id,title").eq("id", post.event_id).maybeSingle()
        : Promise.resolve({ data: null, error: null }),
      loadCommentsByPost(
        supabase,
        [post.id],
        currentUserId,
        currentDisplayName,
        new Map([[post.id, post.user_id]])
      ),
    ]);

  if (profileResult.error || likesResult.error || eventResult.error) {
    return { error: "Couldn't load this post. Refresh and try again." };
  }

  if (commentsResult.error) {
    return { error: commentsResult.error };
  }

  const profile = (profileResult.data ?? undefined) as PostProfile | undefined;
  const likes = (likesResult.data ?? []) as LikeRow[];
  const avatarUrls = await resolveProfileAvatarUrls(supabase, profile ? [profile] : []);
  let imageUrl: string | null = null;

  if (post.image_path) {
    const { data: signed } = await supabase.storage
      .from(POSTS_BUCKET)
      .createSignedUrl(post.image_path, SIGNED_URL_SECONDS);
    imageUrl = signed?.signedUrl ?? null;
  }

  const eventTitle =
    (eventResult.data as { title?: string } | null)?.title ?? null;
  const base = buildBaseFeedPost({
    post,
    profile,
    currentUserId,
    currentDisplayName,
    imageUrl,
    authorAvatarUrl: avatarUrls.get(post.user_id) ?? null,
    likeCount: likes.length,
    hasLiked: likes.some((like) => like.user_id === currentUserId),
    eventTitle,
    now: Date.now(),
  });
  const newestFirst = commentsResult.byPost.get(post.id) ?? [];

  return {
    post: {
      ...base,
      commentCount: newestFirst.length,
      previewComments: newestFirst.slice(0, COMMENT_PREVIEW_COUNT).reverse(),
    },
    comments: [...newestFirst].reverse(),
  };
}
