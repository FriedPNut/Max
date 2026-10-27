import type { createClient } from "@/lib/supabase/server";
import {
  PROFILE_BUCKET,
  PROFILE_SIGNED_URL_SECONDS,
  nameInitial,
  type ProfileEvent,
  type ProfileFriend,
  type ProfilePageResult,
  type ProfilePost,
  type ProfileRecord,
  type ProfileRelationship,
} from "@/lib/profile";

type ServerClient = Awaited<ReturnType<typeof createClient>>;

type PostRow = {
  id: string;
  image_path: string;
  caption: string | null;
  created_at: string;
};

type FriendshipRow = {
  requester_id: string;
  addressee_id: string;
  status: string;
};

type RsvpRow = {
  event_id: string;
};

type LikeRow = {
  post_id: string;
};

type EventRow = {
  id: string;
  title: string;
  location: string;
  starts_at: string;
};

type SignedUrlRow = {
  path: string;
  signedUrl: string;
  error: string | null;
};

const LOAD_ERROR = "Couldn't load this profile. Refresh and try again.";

export async function loadProfilePage(
  supabase: ServerClient,
  profile: ProfileRecord,
  now = Date.now()
): Promise<ProfilePageResult> {
  const [postsResult, friendshipsResult, rsvpsResult] = await Promise.all([
    supabase
      .from("posts")
      .select("id,image_path,caption,created_at")
      .eq("user_id", profile.id)
      .order("created_at", { ascending: false })
      .order("id", { ascending: false }),
    supabase
      .from("friendships")
      .select("requester_id,addressee_id,status")
      .eq("status", "accepted")
      .or(`requester_id.eq.${profile.id},addressee_id.eq.${profile.id}`),
    supabase
      .from("rsvps")
      .select("event_id")
      .eq("user_id", profile.id)
      .eq("status", "going"),
  ]);

  if (postsResult.error || friendshipsResult.error || rsvpsResult.error) {
    return { data: null, error: LOAD_ERROR };
  }

  const postRows = (postsResult.data ?? []) as PostRow[];
  const friendships = (friendshipsResult.data ?? []) as FriendshipRow[];
  const rsvpRows = (rsvpsResult.data ?? []) as RsvpRow[];
  const postIds = postRows.map((post) => post.id);
  const likeCounts = new Map<string, number>();

  if (postIds.length > 0) {
    const { data: likeData, error: likeError } = await supabase
      .from("post_likes")
      .select("post_id")
      .in("post_id", postIds);

    if (likeError) {
      return { data: null, error: LOAD_ERROR };
    }

    for (const like of (likeData ?? []) as LikeRow[]) {
      likeCounts.set(like.post_id, (likeCounts.get(like.post_id) ?? 0) + 1);
    }
  }
  const eventIds = [...new Set(rsvpRows.map((row) => row.event_id))];
  let eventRows: EventRow[] = [];

  if (eventIds.length > 0) {
    const { data, error } = await supabase
      .from("events")
      .select("id,title,location,starts_at")
      .in("id", eventIds);

    if (error) {
      return { data: null, error: LOAD_ERROR };
    }

    eventRows = (data ?? []) as EventRow[];
  }

  const avatarPath = profile.avatar_url?.trim() || null;
  let avatarUrl: string | null = null;

  if (avatarPath) {
    if (/^https?:\/\//i.test(avatarPath)) {
      avatarUrl = avatarPath;
    } else {
      const { data } = await supabase.storage
        .from(PROFILE_BUCKET)
        .createSignedUrl(avatarPath, PROFILE_SIGNED_URL_SECONDS);

      avatarUrl = data?.signedUrl ?? null;
    }
  }

  const postPaths = postRows.map((post) => post.image_path);
  const signedByPath = new Map<string, string>();

  if (postPaths.length > 0) {
    const { data } = await supabase.storage
      .from(PROFILE_BUCKET)
      .createSignedUrls(postPaths, PROFILE_SIGNED_URL_SECONDS);

    for (const item of (data ?? []) as SignedUrlRow[]) {
      if (item.signedUrl) {
        signedByPath.set(item.path, item.signedUrl);
      }
    }
  }

  const posts: ProfilePost[] = postRows.map((post) => ({
    id: post.id,
    imageUrl: signedByPath.get(post.image_path) ?? null,
    caption: post.caption,
    createdAt: post.created_at,
    likeCount: likeCounts.get(post.id) ?? 0,
    imageCount: 1,
  }));

  const nowMs = now;
  const upcomingEvents = eventRows
    .filter((event) => new Date(event.starts_at).getTime() > nowMs)
    .sort(
      (a, b) =>
        new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime()
    )
    .map(toProfileEvent);
  const pastEvents = eventRows
    .filter((event) => new Date(event.starts_at).getTime() <= nowMs)
    .sort(
      (a, b) =>
        new Date(b.starts_at).getTime() - new Date(a.starts_at).getTime()
    )
    .map(toProfileEvent);

  return {
    data: {
      profile,
      avatarUrl,
      stats: {
        posts: posts.length,
        friends: friendships.length,
        events: pastEvents.length,
      },
      posts,
      upcomingEvents,
      pastEvents,
    },
  };
}

function toProfileEvent(event: EventRow): ProfileEvent {
  return {
    id: event.id,
    title: event.title,
    location: event.location,
    startsAt: event.starts_at,
  };
}

export async function loadProfileFriends(
  supabase: ServerClient,
  userId: string
): Promise<{ friends: ProfileFriend[]; error?: string }> {
  const { data: friendshipData, error: friendshipError } = await supabase
    .from("friendships")
    .select("requester_id,addressee_id")
    .eq("status", "accepted")
    .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`);

  if (friendshipError) {
    return { friends: [], error: LOAD_ERROR };
  }

  const friendIds = [
    ...new Set(
      ((friendshipData ?? []) as FriendshipRow[])
        .map((friendship) =>
          friendship.requester_id === userId
            ? friendship.addressee_id
            : friendship.requester_id
        )
        .filter((friendId) => friendId !== userId)
    ),
  ];

  if (friendIds.length === 0) {
    return { friends: [] };
  }

  const { data: profileData, error: profileError } = await supabase
    .from("profiles")
    .select("id,display_name,avatar_url,username")
    .in("id", friendIds);

  if (profileError) {
    return { friends: [], error: LOAD_ERROR };
  }

  const profiles = (profileData ?? []) as {
    id: string;
    display_name: string | null;
    avatar_url: string | null;
    username: string | null;
  }[];
  const avatarUrls = await resolveProfileAvatarUrls(supabase, profiles);

  const friends: ProfileFriend[] = profiles
    .map((profile) => {
      const name =
        profile.display_name?.trim() ||
        profile.username?.trim() ||
        "A friend";

      return {
        id: profile.id,
        name,
        username: profile.username?.trim() || null,
        initial: nameInitial(name),
        avatarUrl: avatarUrls.get(profile.id) ?? null,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  return { friends };
}

export async function resolveProfileAvatarUrls(
  supabase: ServerClient,
  profiles: { id: string; avatar_url: string | null }[]
) {
  const urls = new Map<string, string>();
  const pathOwners = new Map<string, string[]>();

  for (const profile of profiles) {
    const value = profile.avatar_url?.trim();

    if (!value) {
      continue;
    }

    if (/^https?:\/\//i.test(value)) {
      urls.set(profile.id, value);
      continue;
    }

    const owners = pathOwners.get(value);

    if (owners) {
      owners.push(profile.id);
    } else {
      pathOwners.set(value, [profile.id]);
    }
  }

  const paths = [...pathOwners.keys()];

  if (paths.length > 0) {
    const { data } = await supabase.storage
      .from(PROFILE_BUCKET)
      .createSignedUrls(paths, PROFILE_SIGNED_URL_SECONDS);

    for (const item of (data ?? []) as SignedUrlRow[]) {
      if (!item.signedUrl) {
        continue;
      }

      for (const profileId of pathOwners.get(item.path) ?? []) {
        urls.set(profileId, item.signedUrl);
      }
    }
  }

  return urls;
}

export async function loadProfileRelationship(
  supabase: ServerClient,
  currentUserId: string,
  profileUserId: string
): Promise<ProfileRelationship> {
  const { data, error } = await supabase
    .from("friendships")
    .select("id,requester_id,addressee_id,status")
    .or(
      `and(requester_id.eq.${currentUserId},addressee_id.eq.${profileUserId}),and(requester_id.eq.${profileUserId},addressee_id.eq.${currentUserId})`
    )
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    return "none";
  }

  return "friend";
}
