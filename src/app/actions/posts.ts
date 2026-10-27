"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { loadPostPage } from "@/lib/posts-data";
import {
  POSTS_BUCKET,
  type PostActionState,
  type PostPageResult,
} from "@/lib/posts";

async function requireUser() {
  if (!isSupabaseConfigured()) {
    redirect("/login");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return { supabase, user };
}

function displayNameFromUser(user: {
  user_metadata?: Record<string, unknown>;
  email?: string | null;
}) {
  const rawDisplayName =
    typeof user.user_metadata?.display_name === "string"
      ? user.user_metadata.display_name.trim()
      : "";
  const fallbackName = user.email ? user.email.split("@")[0] : "friend";

  return rawDisplayName || fallbackName;
}

export async function loadMorePostsAction(
  offset: number
): Promise<PostPageResult> {
  if (!Number.isInteger(offset) || offset < 0) {
    return {
      posts: [],
      hasMore: false,
      error: "Couldn't load more posts. Try again.",
    };
  }

  const { supabase, user } = await requireUser();

  return loadPostPage(
    supabase,
    user.id,
    displayNameFromUser(user),
    offset
  );
}

export async function createPostAction(input: {
  imagePath: string;
  caption: string;
  eventId?: string | null;
}): Promise<PostActionState> {
  const imagePath = String(input?.imagePath ?? "").trim();
  const caption = String(input?.caption ?? "").trim();
  const eventId = String(input?.eventId ?? "").trim() || null;
  const { supabase, user } = await requireUser();
  const prefix = `posts/${user.id}/`;

  if (
    !imagePath.startsWith(prefix) ||
    !/^\d+\.jpg$/.test(imagePath.slice(prefix.length))
  ) {
    return { error: "That photo didn't upload right. Try again." };
  }

  if (caption.length > 2000) {
    return { error: "That caption is too long." };
  }

  if (eventId) {
    const { data: event, error: eventError } = await supabase
      .from("events")
      .select("id")
      .eq("id", eventId)
      .maybeSingle();

    if (eventError || !event) {
      return { error: "Choose an event from the list." };
    }
  }

  const { error } = await supabase.from("posts").insert({
    user_id: user.id,
    image_path: imagePath,
    caption: caption || null,
    event_id: eventId,
  });

  if (error) {
    return { error: "Couldn't share that post. Try again." };
  }

  revalidatePath("/feed");
  if (eventId) revalidatePath(`/events/${eventId}`);
  return { success: true };
}

export async function togglePostLikeAction(
  postId: string
): Promise<PostActionState> {
  const cleanPostId = String(postId ?? "").trim();

  if (!cleanPostId) {
    return { error: "Couldn't find that post. Refresh and try again." };
  }

  const { supabase, user } = await requireUser();

  const { data: post, error: postError } = await supabase
    .from("posts")
    .select("id")
    .eq("id", cleanPostId)
    .maybeSingle();

  if (postError) {
    return { error: "Couldn't save that like. Try again." };
  }

  if (!post) {
    return { error: "That post is gone." };
  }

  const { data: existingLike, error: likeError } = await supabase
    .from("post_likes")
    .select("post_id")
    .eq("post_id", cleanPostId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (likeError) {
    return { error: "Couldn't save that like. Try again." };
  }

  if (existingLike) {
    const { error } = await supabase
      .from("post_likes")
      .delete()
      .eq("post_id", cleanPostId)
      .eq("user_id", user.id);

    if (error) {
      return { error: "Couldn't save that like. Try again." };
    }
  } else {
    const { error } = await supabase.from("post_likes").insert({
      post_id: cleanPostId,
      user_id: user.id,
    });

    if (error) {
      return { error: "Couldn't save that like. Try again." };
    }
  }

  // One like, one truth: every screen that lists this post refreshes.
  revalidatePath("/feed");
  revalidatePath(`/feed/${cleanPostId}`);
  revalidatePath("/me");
  revalidatePath("/u/[username]", "page");
  return {};
}

export async function deletePostAction(
  postId: string
): Promise<PostActionState> {
  const cleanPostId = String(postId ?? "").trim();

  if (!cleanPostId) {
    return { error: "Couldn't find that post. Refresh and try again." };
  }

  const { supabase, user } = await requireUser();

  const { data: post, error: postError } = await supabase
    .from("posts")
    .select("id,image_path")
    .eq("id", cleanPostId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (postError) {
    return { error: "Couldn't delete that post. Try again." };
  }

  if (!post) {
    return { error: "That post isn't yours to delete." };
  }

  const { data, error } = await supabase
    .from("posts")
    .delete()
    .eq("id", cleanPostId)
    .eq("user_id", user.id)
    .select("id");

  if (error) {
    return { error: "Couldn't delete that post. Try again." };
  }

  if (!data || data.length === 0) {
    return { error: "That post isn't yours to delete." };
  }

  if (post.image_path) {
    await supabase.storage.from(POSTS_BUCKET).remove([post.image_path]);
  }

  // The post can be deleted from its own page, so refresh the feed too.
  revalidatePath("/feed");
  revalidatePath(`/feed/${cleanPostId}`);
  revalidatePath("/me");
  revalidatePath("/u/[username]", "page");
  return {};
}
