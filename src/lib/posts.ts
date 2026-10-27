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
  imageThumbUrl?: string | null;
  // One entry per photo. The current posts table stores one image, so this is
  // usually a single item, but the feed already knows how to page a carousel.
  imageUrls: string[];
  caption: string | null;
  createdAt: string;
  authorId: string;
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

/**
 * Absolute, timezone-stable label ("Mar 4"). Rendered on the server and for
 * hydration so both sides agree, then swapped for a relative label once the
 * browser has a clock.
 */
export function absoluteTimeLabel(iso: string) {
  const date = new Date(iso);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    month: "short",
    day: "numeric",
  }).format(date);
}

/** Callers pass a clock they got from the browser, never a render-time read. */
export function relativeTime(iso: string, now: number) {
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
