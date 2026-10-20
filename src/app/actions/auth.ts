"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";

export type AuthActionState = {
  error?: string;
  notice?: string;
};

function formatAuthError(message: string): string {
  const lower = message.toLowerCase();
  if (
    lower.includes("invalid login credentials") ||
    lower.includes("invalid credentials")
  ) {
    return "That password doesn't match, or we couldn't find that email.";
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
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: formatAuthError(error.message) };
  revalidatePath("/", "layout");
  redirect("/events");
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
  if (data.session) {
    revalidatePath("/", "layout");
    redirect("/events");
  }
  return { notice: "Check your inbox to confirm your email, then sign in." };
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
  revalidatePath("/", "layout");
  redirect("/login");
}
