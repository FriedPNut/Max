export const POSTS_PAGE_SIZE = 10;
export const POSTS_BUCKET = "photos";
export const COMMENT_MAX = 1000;
export const COMMENT_PREVIEW_COUNT = 2;

export type PostRecord = {
  id: string;
  user_id: string;
  image_path: string;
  caption: string | null;
  created_at: string;
  event_id?: string | null;
};

export type PostProfile = {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  username: string | null;
};

export type PostComment = {
  id: string;
  postId: string;
  body: string;
  createdAt: string;
  relativeTime: string;
  authorId: string;
  authorName: string;
  authorInitial: string;
  authorUsername: string | null;
  authorAvatarUrl: string | null;
  // True when I wrote it or I wrote the post it belongs to.
  canDelete: boolean;
};

export type FeedPost = {
  id: string;
  imageUrl: string | null;
  caption: string | null;
  createdAt: string;
  relativeTime: string;
  authorName: string;
  authorInitial: string;
  authorUsername: string | null;
  authorAvatarUrl: string | null;
  likeCount: number;
  hasLiked: boolean;
  isOwner: boolean;
  eventId: string | null;
  eventTitle: string | null;
  commentCount: number;
  // Latest two comments, oldest first, for the feed preview.
  previewComments: PostComment[];
};

export type PostPageResult = {
  posts: FeedPost[];
  hasMore: boolean;
  error?: string;
};

export type PostActionState = {
  error?: string;
  success?: boolean;
};

export function profileName(
  profile: PostProfile | undefined,
  fallback = "A friend"
) {
  return (
    profile?.display_name?.trim() ||
    profile?.username?.trim() ||
    fallback
  );
}

export function nameInitial(name: string) {
  return name.charAt(0).toUpperCase() || "?";
}

export function relativeTime(iso: string, now = Date.now()) {
  const date = new Date(iso);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const diff = Math.max(0, now - date.getTime());
  const minute = 60_000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diff < minute) {
    return "Just now";
  }

  if (diff < hour) {
    return `${Math.floor(diff / minute)}m`;
  }

  if (diff < day) {
    return `${Math.floor(diff / hour)}h`;
  }

  if (diff < 7 * day) {
    return `${Math.floor(diff / day)}d`;
  }

  if (diff < 30 * day) {
    return `${Math.floor(diff / (7 * day))}w`;
  }

  if (diff < 365 * day) {
    return `${Math.floor(diff / (30 * day))}mo`;
  }

  return `${Math.floor(diff / (365 * day))}y`;
}
