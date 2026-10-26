import type { createClient } from "@/lib/supabase/server";
import { resolveProfileAvatarUrls } from "@/lib/profile-data";
import {
  POSTS_BUCKET,
  nameInitial,
  relativeTime,
  type PostProfile,
} from "@/lib/posts";
import type {
  StoriesResult,
  StoryGroup,
  StoryItem,
  StoryViewer,
} from "@/lib/stories";

type ServerClient = Awaited<ReturnType<typeof createClient>>;

type StoryPostRow = {
  id: string;
  user_id: string;
  image_path: string;
  caption: string | null;
  created_at: string;
};

type SignedUrlRow = {
  path: string;
  signedUrl: string;
  error: string | null;
};

const STORY_POST_LIMIT = 30;
const SIGNED_URL_SECONDS = 60 * 60 * 24;

/**
 * Stories are a view over recent posts. There is no stories table: every post
 * from the last page of the feed becomes one story, grouped by its author, so
 * the row uses real photos and keeps the data model unchanged.
 */
export async function loadStories(
  supabase: ServerClient,
  viewerId: string
): Promise<StoriesResult> {
  const { data: postData, error: postError } = await supabase
    .from("posts")
    .select("id,user_id,image_path,caption,created_at")
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(STORY_POST_LIMIT);

  if (postError || !postData) {
    return {
      groups: [],
      viewer: {
        id: viewerId,
        name: "You",
        username: null,
        initial: "Y",
        avatarUrl: null,
      },
    };
  }

  const rows = postData as StoryPostRow[];
  const authorIds = [...new Set([...rows.map((row) => row.user_id), viewerId])];
  const [profileResult, signedResult] = await Promise.all([
    supabase
      .from("profiles")
      .select("id,display_name,avatar_url,username")
      .in("id", authorIds),
    rows.length > 0
      ? supabase.storage
          .from(POSTS_BUCKET)
          .createSignedUrls(
            rows.map((row) => row.image_path),
            SIGNED_URL_SECONDS
          )
      : Promise.resolve({ data: [], error: null }),
  ]);

  const profiles = (profileResult.data ?? []) as PostProfile[];
  const profilesById = new Map(profiles.map((profile) => [profile.id, profile]));
  const avatarUrls = await resolveProfileAvatarUrls(supabase, profiles);

  const signedByPath = new Map<string, string>();

  for (const item of (signedResult.data ?? []) as SignedUrlRow[]) {
    if (item.signedUrl) {
      signedByPath.set(item.path, item.signedUrl);
    }
  }

  const now = Date.now();
  const groupsById = new Map<string, StoryGroup>();

  for (const row of rows) {
    const profile = profilesById.get(row.user_id);
    const name =
      profile?.display_name?.trim() ||
      profile?.username?.trim() ||
      (row.user_id === viewerId ? "You" : "A friend");
    let group = groupsById.get(row.user_id);

    if (!group) {
      group = {
        id: row.user_id,
        userId: row.user_id,
        name,
        username: profile?.username?.trim() || null,
        initial: nameInitial(name),
        avatarUrl: avatarUrls.get(row.user_id) ?? null,
        isMine: row.user_id === viewerId,
        stories: [],
      };
      groupsById.set(row.user_id, group);
    }

    const story: StoryItem = {
      id: row.id,
      postId: row.id,
      imageUrl: signedByPath.get(row.image_path) ?? null,
      caption: row.caption,
      createdAt: row.created_at,
      relativeTime: relativeTime(row.created_at, now),
    };

    group.stories.push(story);
  }

  const groups = [...groupsById.values()];
  const ownGroup = groupsById.get(viewerId);
  const ordered = ownGroup
    ? [ownGroup, ...groups.filter((group) => group.id !== ownGroup.id)]
    : groups;

  // Posts arrive newest first; Instagram plays each person's stories oldest
  // first, so flip only the stories inside a group.
  for (const group of ordered) {
    group.stories.reverse();
  }

  const viewerProfile = profilesById.get(viewerId);
  const viewerName =
    viewerProfile?.display_name?.trim() ||
    viewerProfile?.username?.trim() ||
    "You";
  const viewer: StoryViewer = {
    id: viewerId,
    name: viewerName,
    username: viewerProfile?.username?.trim() || null,
    initial: nameInitial(viewerName),
    avatarUrl: avatarUrls.get(viewerId) ?? null,
  };

  return { groups: ordered, viewer };
}
