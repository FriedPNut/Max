import type { createClient } from "@/lib/supabase/server";
import { resolveProfileAvatarUrls } from "@/lib/profile-data";
import { nameInitial, profileName } from "@/lib/posts";
import { POSTS_BUCKET } from "@/lib/posts";

 type ServerClient = Awaited<ReturnType<typeof createClient>>;

type PhotoRow = {
  id: string;
  user_id: string;
  image_path: string;
  caption: string | null;
  created_at: string;
};
type PhotoProfile = {
  id: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
};
type SignedPhoto = { path: string; signedUrl: string | null };

export type EventPhoto = {
  id: string;
  imageUrl: string;
  caption: string | null;
  createdAt: string;
  authorName: string;
  authorInitial: string;
  authorUsername: string | null;
  authorAvatarUrl: string | null;
};

export async function loadEventPhotos(
  supabase: ServerClient,
  eventId: string,
  currentUserId: string,
  currentUserName: string
): Promise<{ photos: EventPhoto[]; error?: string }> {
  const { data, error } = await supabase
    .from("posts")
    .select("id,user_id,image_path,caption,created_at")
    .eq("event_id", eventId)
    .order("created_at", { ascending: false })
    .limit(150);

  if (error) return { photos: [], error: "Couldn't load event photos. Refresh and try again." };

  const rows = (data ?? []) as PhotoRow[];
  if (rows.length === 0) return { photos: [] };
  const authorIds = [...new Set(rows.map((row) => row.user_id))];
  const { data: profileData, error: profileError } = await supabase
    .from("profiles")
    .select("id,display_name,username,avatar_url")
    .in("id", authorIds);
  if (profileError) return { photos: [], error: "Couldn't load event photos. Refresh and try again." };

  const profiles = (profileData ?? []) as PhotoProfile[];
  const profilesById = new Map(profiles.map((profile) => [profile.id, profile]));
  const [avatarUrls, signedResult] = await Promise.all([
    resolveProfileAvatarUrls(supabase, profiles),
    supabase.storage.from(POSTS_BUCKET).createSignedUrls(
      rows.map((row) => row.image_path),
      60 * 60 * 24
    ),
  ]);
  if (signedResult.error) return { photos: [], error: "Couldn't load event photos. Refresh and try again." };
  const signedByPath = new Map(
    ((signedResult.data ?? []) as SignedPhoto[])
      .filter((item) => item.signedUrl)
      .map((item) => [item.path, item.signedUrl as string])
  );

  return {
    photos: rows.flatMap((row) => {
      const imageUrl = signedByPath.get(row.image_path);
      if (!imageUrl) return [];
      const profile = profilesById.get(row.user_id);
      const authorName = profileName(
        profile,
        row.user_id === currentUserId ? currentUserName : "A friend"
      );
      return [{
        id: row.id,
        imageUrl,
        caption: row.caption,
        createdAt: row.created_at,
        authorName,
        authorInitial: nameInitial(authorName),
        authorUsername: profile?.username?.trim() || null,
        authorAvatarUrl: avatarUrls.get(row.user_id) ?? null,
      }];
    }),
  };
}
