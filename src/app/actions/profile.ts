"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { isValidMonthDay } from "@/lib/birthdays";
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
  revalidatePath("/events");
  revalidatePath(`/u/${username}`);

  return { success: true };
}

export async function updateBirthdayAction(input: {
  month: number | null;
  day: number | null;
  year: number | null;
}): Promise<ProfileActionState> {
  const { supabase, user } = await requireUser();
  const { month, day, year } = input;
  const clearing = month === null && day === null && year === null;

  if (!clearing) {
    if (month === null || day === null || !isValidMonthDay(month, day)) {
      return { error: "That birthday doesn't look right." };
    }

    if (year !== null && (!Number.isInteger(year) || year < 1900 || year > new Date().getFullYear())) {
      return { error: "Use a year that makes sense, or leave it blank." };
    }
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      birth_month: clearing ? null : month,
      birth_day: clearing ? null : day,
      birth_year: clearing ? null : year,
    })
    .eq("id", user.id);

  if (error) {
    return { error: "Couldn't save your birthday. Try again." };
  }

  revalidatePath("/me");
  revalidatePath("/me/edit");
  revalidatePath("/birthdays");
  revalidatePath("/events");
  return { success: true };
}

/**
 * Read receipts are reciprocal: with them off, seen_at stops being written and
 * nobody else's markers are shown.
 */
export async function setReadReceiptsAction(
  enabled: boolean
): Promise<{ error?: string; enabled?: boolean }> {
  const { supabase, user } = await requireUser();
  const next = Boolean(enabled);

  const { error } = await supabase
    .from("profiles")
    .update({ read_receipts: next })
    .eq("id", user.id);

  if (error) {
    return { error: "Couldn't save that. Try again." };
  }

  revalidatePath("/settings");
  revalidatePath("/chat");
  return { enabled: next };
}
