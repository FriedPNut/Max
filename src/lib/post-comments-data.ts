import type { createClient } from "@/lib/supabase/server";
import { resolveProfileAvatarUrls } from "@/lib/profile-data";
import {
  nameInitial,
  profileName,
  type PostComment,
  type PostProfile,
} from "@/lib/posts";

type ServerClient = Awaited<ReturnType<typeof createClient>>;

type PostCommentRow = {
  id: string;
  post_id: string;
  user_id: string;
  body: string;
  created_at: string;
};

export type PostCommentsResult = {
  // Comments per post, newest first.
  byPost: Map<string, PostComment[]>;
  error?: string;
};

// One query for every post id passed in, so a feed page never queries per post.
export async function loadCommentsByPost(
  supabase: ServerClient,
  postIds: string[],
  currentUserId: string,
  currentDisplayName: string,
  postAuthorByPost: Map<string, string>
): Promise<PostCommentsResult> {
  const byPost = new Map<string, PostComment[]>();

  if (postIds.length === 0) {
    return { byPost };
  }

  const { data, error } = await supabase
    .from("post_comments")
    .select("id,post_id,user_id,body,created_at")
    .in("post_id", postIds)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false });

  if (error) {
    return { byPost, error: "Couldn't load comments. Refresh and try again." };
  }

  const rows = (data ?? []) as PostCommentRow[];
  const authorIds = [...new Set(rows.map((row) => row.user_id))];
  let profiles: PostProfile[] = [];

  if (authorIds.length > 0) {
    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .select("id,display_name,avatar_url,username")
      .in("id", authorIds);

    if (profileError) {
      return { byPost, error: "Couldn't load comments. Refresh and try again." };
    }

    profiles = (profileData ?? []) as PostProfile[];
  }

  const profilesById = new Map(profiles.map((profile) => [profile.id, profile]));
  const avatarUrls = await resolveProfileAvatarUrls(supabase, profiles);

  for (const row of rows) {
    const profile = profilesById.get(row.user_id);
    const name = profileName(
      profile,
      row.user_id === currentUserId ? currentDisplayName : "A friend"
    );
    const comment: PostComment = {
      id: row.id,
      postId: row.post_id,
      body: row.body,
      createdAt: row.created_at,
      authorId: row.user_id,
      authorName: name,
      authorInitial: nameInitial(name),
      authorUsername: profile?.username?.trim() || null,
      authorAvatarUrl: avatarUrls.get(row.user_id) ?? null,
      canDelete:
        row.user_id === currentUserId ||
        postAuthorByPost.get(row.post_id) === currentUserId,
    };
    const list = byPost.get(row.post_id);

    if (list) {
      list.push(comment);
    } else {
      byPost.set(row.post_id, [comment]);
    }
  }

  return { byPost };
}
