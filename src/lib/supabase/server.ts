import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export function isSupabaseConfigured() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

// Dev-only timing for every PostgREST/auth/storage call a page makes.
function timedFetch(input: RequestInfo | URL, init?: RequestInit) {
  if (process.env.NODE_ENV === "production") return fetch(input, init);

  const started = performance.now();
  const url =
    typeof input === "string"
      ? input
      : input instanceof URL
      ? input.href
      : input.url;
  let pathname = url;

  try {
    pathname = new URL(url).pathname;
  } catch {
    // Keep the raw value for a useful log.
  }

  return fetch(input, init).finally(() => {
    console.debug(
      `[perf] supabase ${(performance.now() - started).toFixed(0)}ms ${pathname}`
    );
  });
}

export async function createClient() {
  const cookieStore = await cookies();
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
  const supabaseAnonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-anon-key";

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    global: { fetch: timedFetch },
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // Called from a Server Component where cookies cannot be mutated directly.
          // Middleware refreshes sessions where needed.
        }
      },
    },
  });
}
