"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import {
  BIO_MAX_LENGTH,
  DISPLAY_NAME_MAX_LENGTH,
  USERNAME_MAX_LENGTH,
  USERNAME_MIN_LENGTH,
  isAvatarPath,
  isValidUsername,
  normalizeUsername,
  type ProfileActionState,
} from "@/lib/profile";

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

function isDuplicateError(error: { code?: string; message?: string } | null) {
  return (
    error?.code === "23505" ||
    /duplicate key|unique constraint/i.test(error?.message ?? "")
  );
}

export async function updateProfileAction(input: {
  displayName: string;
  username: string;
  bio: string;
  avatarPath: string;
}): Promise<ProfileActionState> {
  const displayName = String(input?.displayName ?? "").trim();
  const username = normalizeUsername(String(input?.username ?? ""));
  const bio = String(input?.bio ?? "").trim();
  const avatarPath = String(input?.avatarPath ?? "").trim();
  const { supabase, user } = await requireUser();

  if (!displayName) {
    return { error: "Add a display name." };
  }

  if (displayName.length > DISPLAY_NAME_MAX_LENGTH) {
    return {
      error: `Keep your display name under ${DISPLAY_NAME_MAX_LENGTH} characters.`,
    };
  }

  if (!username) {
    return { error: "Pick a username." };
  }

  if (username.length < USERNAME_MIN_LENGTH) {
    return {
      error: `Use at least ${USERNAME_MIN_LENGTH} characters for your username.`,
    };
  }

  if (!isValidUsername(username)) {
    return {
      error:
        username.length > USERNAME_MAX_LENGTH
          ? `Keep your username under ${USERNAME_MAX_LENGTH} characters.`
          : "Use lowercase letters, numbers, and underscores only.",
    };
  }

  if (bio.length > BIO_MAX_LENGTH) {
    return { error: `Keep your bio under ${BIO_MAX_LENGTH} characters.` };
  }

  if (
    avatarPath &&
    !/^https?:\/\//i.test(avatarPath) &&
    !isAvatarPath(avatarPath, user.id)
  ) {
    return { error: "That photo didn't upload right. Try again." };
  }

  const { data: taken, error: takenError } = await supabase
    .from("profiles")
    .select("id")
    .eq("username", username)
    .neq("id", user.id)
    .limit(1)
    .maybeSingle();

  if (takenError) {
    return { error: "Couldn't save your profile. Try again." };
  }

  if (taken) {
    return { error: "That username is taken. Try another one." };
  }

  const values = {
    display_name: displayName,
    username,
    bio: bio || null,
    avatar_url: avatarPath || null,
  };

  const { data: existing, error: existingError } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

  if (existingError) {
    return { error: "Couldn't save your profile. Try again." };
  }

  if (existing) {
    const { error } = await supabase
      .from("profiles")
      .update(values)
      .eq("id", user.id);

    if (error) {
      return {
        error: isDuplicateError(error)
          ? "That username is taken. Try another one."
          : "Couldn't save your profile. Try again.",
      };
    }
  } else {
    const { error } = await supabase.from("profiles").insert({
      id: user.id,
      ...values,
    });

    if (error) {
      return {
        error: isDuplicateError(error)
          ? "That username is taken. Try another one."
          : "Couldn't save your profile. Try again.",
      };
    }
  }

  await supabase.auth.updateUser({
    data: {
      display_name: displayName,
    },
  });

  revalidatePath("/me");
  revalidatePath("/feed");
  revalidatePath("/chat");
  revalidatePath("/chat/friends");
  revalidatePath("/events");
  revalidatePath(`/u/${username}`);

  return { success: true };
}

export async function requestProfileFriendshipAction(
  profileId: string
): Promise<ProfileActionState> {
  const targetId = String(profileId ?? "").trim();
  const { supabase, user } = await requireUser();

  if (!targetId || targetId === user.id) {
    return { error: "That request can't be sent." };
  }

  const { data: target, error: targetError } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", targetId)
    .maybeSingle();

  if (targetError) {
    return { error: "Couldn't send that request. Try again." };
  }

  if (!target) {
    return { error: "That profile is gone." };
  }

  const { data: existing, error: existingError } = await supabase
    .from("friendships")
    .select("id,requester_id,addressee_id,status")
    .or(
      `and(requester_id.eq.${user.id},addressee_id.eq.${targetId}),and(requester_id.eq.${targetId},addressee_id.eq.${user.id})`
    )
    .limit(1)
    .maybeSingle();

  if (existingError) {
    return { error: "Couldn't send that request. Try again." };
  }

  if (existing) {
    if (existing.status === "accepted") {
      return { relationship: "friend" };
    }

    if (existing.status === "pending") {
      if (existing.requester_id === user.id) {
        return { relationship: "sent" };
      }

      const { data: accepted, error } = await supabase
        .from("friendships")
        .update({ status: "accepted" })
        .eq("id", existing.id)
        .eq("addressee_id", user.id)
        .eq("status", "pending")
        .select("id")
        .maybeSingle();

      if (error) {
        return { error: "Couldn't accept that request. Try again." };
      }

      if (!accepted) {
        return { error: "That request is no longer available." };
      }

      revalidatePath("/me");
      revalidatePath("/chat/friends");
      revalidatePath("/chat/new");
      return { relationship: "friend" };
    }

    return { error: "Couldn't send that request. Try again." };
  }

  const { error } = await supabase.from("friendships").insert({
    requester_id: user.id,
    addressee_id: targetId,
    status: "pending",
  });

  if (error) {
    return { error: "Couldn't send that request. Try again." };
  }

  revalidatePath("/chat/friends");
  revalidatePath("/chat/new");
  return { relationship: "sent" };
}
