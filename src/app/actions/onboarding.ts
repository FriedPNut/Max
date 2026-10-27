"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { isValidMonthDay } from "@/lib/birthdays";
import {
  ONBOARDED_COOKIE,
  ONBOARDED_COOKIE_OPTIONS,
  ONBOARDED_PENDING,
  ONBOARDED_SET,
} from "@/lib/onboarding";
import {
  DISPLAY_NAME_MAX_LENGTH,
  USERNAME_MAX_LENGTH,
  USERNAME_MIN_LENGTH,
  isAvatarPath,
  isValidUsername,
  normalizeUsername,
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

/** Live username availability; the save re-checks before writing. */
export async function checkUsernameAction(rawUsername: string) {
  if (!isSupabaseConfigured()) return { taken: false };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const username = normalizeUsername(String(rawUsername ?? ""));

  if (!isValidUsername(username)) return { taken: false };

  let query = supabase.from("profiles").select("id").eq("username", username);

  if (user) {
    query = query.neq("id", user.id);
  }

  const { data } = await query.limit(1).maybeSingle();

  return { taken: Boolean(data) };
}

type SaveInput = {
  displayName: string;
  username: string;
  avatarPath: string | null;
  birthday: { month: number | null; day: number | null; year: number | null };
};

/** Saves only what changed, so Continue and Skip behave differently. */
export async function saveOnboardingProfileAction(
  input: SaveInput
): Promise<{ error?: string; success?: boolean }> {
  const displayName = String(input?.displayName ?? "").trim();
  const username = normalizeUsername(String(input?.username ?? ""));
  const avatarPath = input?.avatarPath ? String(input.avatarPath) : null;
  const birthday = input?.birthday ?? { month: null, day: null, year: null };
  const { supabase, user } = await requireUser();

  if (!displayName) return { error: "Add your name." };

  if (displayName.length > DISPLAY_NAME_MAX_LENGTH) {
    return { error: `Keep your name under ${DISPLAY_NAME_MAX_LENGTH}.` };
  }

  if (!username) return { error: "Pick a username." };

  if (!isValidUsername(username)) {
    return {
      error:
        username.length < USERNAME_MIN_LENGTH
          ? `Use at least ${USERNAME_MIN_LENGTH} characters.`
          : username.length > USERNAME_MAX_LENGTH
          ? `Keep your username under ${USERNAME_MAX_LENGTH}.`
          : "Use lowercase letters, numbers, and underscores.",
    };
  }

  if (avatarPath && !/^https?:\/\//i.test(avatarPath) && !isAvatarPath(avatarPath, user.id)) {
    return { error: "That photo didn't upload right. Try again." };
  }

  if (birthday.month !== null && birthday.day !== null) {
    if (!isValidMonthDay(birthday.month, birthday.day)) {
      return { error: "That birthday doesn't look right." };
    }
  } else if (birthday.month !== null || birthday.day !== null) {
    return { error: "Pick a month and day." };
  }

  if (
    birthday.year !== null &&
    (!Number.isInteger(birthday.year) ||
      birthday.year < 1900 ||
      birthday.year > new Date().getFullYear())
  ) {
    return { error: "Use a year that makes sense, or leave it blank." };
  }

  const { data: taken, error: takenError } = await supabase
    .from("profiles")
    .select("id")
    .eq("username", username)
    .neq("id", user.id)
    .limit(1)
    .maybeSingle();

  if (takenError) return { error: "Couldn't save that. Try again." };
  if (taken) return { error: "That username is taken." };

  const { data: existing, error: existingError } = await supabase
    .from("profiles")
    .select("id,display_name,username,avatar_url,birth_month,birth_day,birth_year")
    .eq("id", user.id)
    .maybeSingle();

  if (existingError) return { error: "Couldn't save that. Try again." };

  const values: Record<string, unknown> = {};

  if ((existing?.display_name ?? "").trim() !== displayName) {
    values.display_name = displayName;
  }

  if ((existing?.username ?? "") !== username) {
    values.username = username;
  }

  if (avatarPath && existing?.avatar_url !== avatarPath) {
    values.avatar_url = avatarPath;
  }

  const month = birthday.month;
  const day = birthday.day;
  const year = birthday.year;

  if (
    month !== null &&
    day !== null &&
    (existing?.birth_month !== month ||
      existing?.birth_day !== day ||
      existing?.birth_year !== year)
  ) {
    values.birth_month = month;
    values.birth_day = day;
    values.birth_year = year;
  }

  if (Object.keys(values).length === 0) {
    return { success: true };
  }

  if (existing) {
    const { error } = await supabase
      .from("profiles")
      .update(values)
      .eq("id", user.id);

    if (error) {
      return {
        error: isDuplicateError(error)
          ? "That username is taken."
          : "Couldn't save that. Try again.",
      };
    }
  } else {
    const { error } = await supabase
      .from("profiles")
      .insert({ id: user.id, ...values });

    if (error) {
      return {
        error: isDuplicateError(error)
          ? "That username is taken."
          : "Couldn't save that. Try again.",
      };
    }
  }

  if ("display_name" in values) {
    await supabase.auth.updateUser({ data: { display_name: displayName } });
  }

  revalidatePath("/", "layout");
  return { success: true };
}

/**
 * Marks onboarding done and stores the cookie that keeps every later page from
 * touching the database. A failed save still lets the person in: the cookie is
 * stored as pending and the next page load retries in the proxy.
 */
export async function completeOnboardingAction({
  replay,
}: {
  replay: boolean;
}): Promise<{ saved: boolean }> {
  const { supabase, user } = await requireUser();
  const cookieStore = await cookies();

  // Replay never touches onboarded_at.
  if (replay) {
    return { saved: true };
  }

  const { data: updated, error } = await supabase
    .from("profiles")
    .update({ onboarded_at: new Date().toISOString() })
    .eq("id", user.id)
    .select("id");

  let saved = !error && Array.isArray(updated) && updated.length > 0;

  if (!saved && !error) {
    // No profile row yet; create the one row we own.
    const { error: insertError } = await supabase
      .from("profiles")
      .insert({ id: user.id, onboarded_at: new Date().toISOString() });

    saved = !insertError;
  }

  cookieStore.set(
    ONBOARDED_COOKIE,
    saved ? ONBOARDED_SET : ONBOARDED_PENDING,
    ONBOARDED_COOKIE_OPTIONS
  );

  revalidatePath("/", "layout");
  return { saved };
}
