export const PROFILE_BUCKET = "photos";
export const PROFILE_SIGNED_URL_SECONDS = 60 * 60 * 24;

export const DISPLAY_NAME_MAX_LENGTH = 50;
export const USERNAME_MIN_LENGTH = 3;
export const USERNAME_MAX_LENGTH = 20;
export const BIO_MAX_LENGTH = 150;
export const USERNAME_PATTERN = /^[a-z0-9_]+$/;

export type ProfileRecord = {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  username: string | null;
  bio: string | null;
};

export type ProfilePost = {
  id: string;
  imageUrl: string | null;
  caption: string | null;
  createdAt: string;
  likeCount: number;
  // Posts currently store one photo; the grid can badge future carousels.
  imageCount?: number;
};

export type ProfileFriend = {
  id: string;
  name: string;
  username: string | null;
  initial: string;
  avatarUrl: string | null;
};

export type ProfileEvent = {
  id: string;
  title: string;
  location: string;
  startsAt: string;
};

export type ProfileStats = {
  posts: number;
  friends: number;
  events: number;
};

export type ProfilePageData = {
  profile: ProfileRecord;
  avatarUrl: string | null;
  stats: ProfileStats;
  posts: ProfilePost[];
  upcomingEvents: ProfileEvent[];
  pastEvents: ProfileEvent[];
};

export type ProfilePageResult = {
  data: ProfilePageData | null;
  error?: string;
};

export type ProfileRelationship = "none" | "friend";

export type ProfileActionState = {
  error?: string;
  success?: boolean;
};

export function normalizeUsername(value: string) {
  return value.trim().toLowerCase();
}

export function isValidUsername(value: string) {
  return (
    value.length >= USERNAME_MIN_LENGTH &&
    value.length <= USERNAME_MAX_LENGTH &&
    USERNAME_PATTERN.test(value)
  );
}

export function isAvatarPath(value: string, userId: string) {
  const prefix = `avatars/${userId}/`;
  return value.startsWith(prefix) && /^\d+\.jpg$/.test(value.slice(prefix.length));
}

export function profileDisplayName(
  profile: ProfileRecord | undefined,
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
