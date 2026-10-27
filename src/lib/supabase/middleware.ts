import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import {
  ONBOARDED_COOKIE,
  ONBOARDED_COOKIE_OPTIONS,
  ONBOARDED_PENDING,
  ONBOARDED_SET,
} from "@/lib/onboarding";

type SessionCookie = { name: string; value: string; options: CookieOptions };

/**
 * Cheapest possible onboarding gate: the cookie decides. Only when it is
 * missing do we read `onboarded_at` once and store the answer for a year.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  // Cookies refreshed by getClaims, kept so redirects keep the new session.
  let refreshedCookies: SessionCookie[] = [];

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    // Without configured keys, any protected route redirects to /login
    if (!request.nextUrl.pathname.startsWith("/login")) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      return NextResponse.redirect(url);
    }
    return supabaseResponse;
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        refreshedCookies = cookiesToSet;
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );
        supabaseResponse = NextResponse.next({
          request,
        });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
      },
    },
  });

  // getClaims verifies the JWT signature (locally against a cached JWKS when
  // the project uses asymmetric signing keys, otherwise against Auth) and
  // refreshes the session cookie when the token is close to expiring.
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub
    ? String(claimsData.claims.sub)
    : null;
  const signedIn = Boolean(userId);

  const pathname = request.nextUrl.pathname;
  const isAuthPage = pathname.startsWith("/login");
  const isWelcome = pathname === "/welcome";
  const isReplay = isWelcome && request.nextUrl.searchParams.get("replay") === "1";

  let onboardedCookie = request.cookies.get(ONBOARDED_COOKIE)?.value ?? null;

  if (!signedIn && !isAuthPage) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    return finalize(NextResponse.redirect(url), refreshedCookies, null);
  }

  if (signedIn && isAuthPage) {
    const url = request.nextUrl.clone();
    url.pathname = onboardedCookie ? "/events" : "/welcome";
    return finalize(NextResponse.redirect(url), refreshedCookies, null);
  }

  if (!signedIn || !userId) {
    return supabaseResponse;
  }

  // A pending cookie means the finish save failed. Retry it here, in the
  // background, so the person never sees onboarding twice.
  if (onboardedCookie === ONBOARDED_PENDING) {
    const saved = await markOnboarded(supabase, userId);

    if (saved) {
      onboardedCookie = ONBOARDED_SET;
    }
  }

  if (!onboardedCookie) {
    const onboarded = await hasOnboarded(supabase, userId);

    if (onboarded) {
      onboardedCookie = ONBOARDED_SET;
    } else if (!isWelcome) {
      const url = request.nextUrl.clone();
      url.pathname = "/welcome";
      url.search = "";
      return finalize(NextResponse.redirect(url), refreshedCookies, null);
    }
  }

  if (
    isWelcome &&
    !isReplay &&
    (onboardedCookie === ONBOARDED_SET || onboardedCookie === ONBOARDED_PENDING)
  ) {
    const url = request.nextUrl.clone();
    url.pathname = "/events";
    url.search = "";
    return finalize(NextResponse.redirect(url), refreshedCookies, null);
  }

  return finalize(
    supabaseResponse,
    refreshedCookies,
    onboardedCookie === ONBOARDED_SET ? ONBOARDED_SET : null
  );
}

async function hasOnboarded(
  supabase: ReturnType<typeof createServerClient>,
  userId: string
) {
  const { data, error } = await supabase
    .from("profiles")
    .select("onboarded_at")
    .eq("id", userId)
    .maybeSingle();

  // Fail open: a lookup blip should never trap someone in onboarding.
  if (error) {
    return true;
  }

  return Boolean(data?.onboarded_at);
}

async function markOnboarded(
  supabase: ReturnType<typeof createServerClient>,
  userId: string
) {
  const { error } = await supabase
    .from("profiles")
    .update({ onboarded_at: new Date().toISOString() })
    .eq("id", userId);

  return !error;
}

function finalize(
  response: NextResponse,
  cookies: SessionCookie[],
  onboarded: string | null
) {
  for (const { name, value, options } of cookies) {
    response.cookies.set(name, value, options);
  }

  if (onboarded) {
    response.cookies.set(
      ONBOARDED_COOKIE,
      onboarded,
      ONBOARDED_COOKIE_OPTIONS
    );
  }

  return response;
}
