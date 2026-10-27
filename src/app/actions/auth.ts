"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import {
  ONBOARDED_COOKIE,
  ONBOARDED_COOKIE_OPTIONS,
  ONBOARDED_SET,
} from "@/lib/onboarding";

export type AuthActionState = {
  error?: string;
  /** Where the client should land, using a full navigation. */
  redirectTo?: string;
};

function formatAuthError(message: string): string {
  const lower = message.toLowerCase();
  if (
    lower.includes("invalid login credentials") ||
    lower.includes("invalid credentials")
  ) {
    return "That email or password doesn't match.";
  }
  if (lower.includes("user already registered")) {
    return "That email already has an account. Sign in instead.";
  }
  if (lower.includes("password should be at least")) {
    return "Pick a password with at least 6 characters.";
  }
  if (lower.includes("unable to validate email")) {
    return "That doesn't look like a working email address.";
  }
  return message;
}

export async function signInAction(
  _prevState: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  if (!isSupabaseConfigured()) {
    return {
      error:
        "Supabase keys aren't set yet. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local.",
    };
  }

  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) return { error: "Enter both your email and password." };
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) return { error: formatAuthError(error.message) };
  if (!data.user) return { error: "Couldn't sign you in. Try again." };
  revalidatePath("/", "layout");
  return routeAfterAuth(supabase, data.user.id);
}

export async function signUpAction(
  _prevState: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  if (!isSupabaseConfigured()) {
    return {
      error:
        "Supabase keys aren't set yet. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local.",
    };
  }

  const displayName = String(formData.get("display_name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!displayName) return { error: "Tell us what your friends call you." };
  if (!email || !password) return { error: "Enter both an email and a password." };
  if (password.length < 6) return { error: "Pick a password with at least 6 characters." };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { display_name: displayName } },
  });
  if (error) return { error: formatAuthError(error.message) };

  if (!data.session) {
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (signInError) return { error: formatAuthError(signInError.message) };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  revalidatePath("/", "layout");

  if (!user) return { error: "Account made. Log in to continue." };

  return routeAfterAuth(supabase, user.id);
}

/**
 * One profile read after signing in picks the first screen, and stores the
 * cookie that keeps every later page from asking the database again.
 */
async function routeAfterAuth(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string
): Promise<AuthActionState> {
  const { data } = await supabase
    .from("profiles")
    .select("onboarded_at")
    .eq("id", userId)
    .maybeSingle();

  const cookieStore = await cookies();

  if (data?.onboarded_at) {
    cookieStore.set(
      ONBOARDED_COOKIE,
      ONBOARDED_SET,
      ONBOARDED_COOKIE_OPTIONS
    );
    return { redirectTo: "/events" };
  }

  cookieStore.set(ONBOARDED_COOKIE, "", {
    ...ONBOARDED_COOKIE_OPTIONS,
    maxAge: 0,
  });
  return { redirectTo: "/welcome" };
}

export async function removeCurrentPushSubscriptionAction(endpoint: string) {
  const cleanEndpoint = String(endpoint ?? "").trim();
  if (!cleanEndpoint.startsWith("https://")) return { error: "That device isn't valid." };
  if (!isSupabaseConfigured()) return { error: "Sign in to remove this device." };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Sign in to remove this device." };
  const { data: subscription, error: lookupError } = await supabase
    .from("push_subscriptions")
    .select("endpoint")
    .eq("user_id", user.id)
    .eq("endpoint", cleanEndpoint)
    .maybeSingle();
  if (lookupError || !subscription) return { error: "Couldn't remove this device." };
  try {
    const { createAdminClient } = await import("@/lib/supabase/admin");
    const { error } = await createAdminClient()
      .from("push_subscriptions")
      .delete()
      .eq("user_id", user.id)
      .eq("endpoint", cleanEndpoint);
    return error ? { error: "Couldn't remove this device." } : {};
  } catch {
    return { error: "Couldn't remove this device." };
  }
}

export async function signOutAction() {
  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    await supabase.auth.signOut();
  }
  const cookieStore = await cookies();
  cookieStore.set(ONBOARDED_COOKIE, "", {
    ...ONBOARDED_COOKIE_OPTIONS,
    maxAge: 0,
  });
  revalidatePath("/", "layout");
  // The client wipes its caches and does a full navigation to /login, so no
  // router entry or in-memory list can survive the account switch.
  return { signedOut: true };
}
