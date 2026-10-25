import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  // Cookies refreshed by getClaims, kept so redirects keep the new session.
  let refreshedCookies: { name: string; value: string; options: CookieOptions }[] = [];

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
  const signedIn = Boolean(claimsData?.claims?.sub);

  const isAuthPage = request.nextUrl.pathname.startsWith("/login");
  const isCallback = request.nextUrl.pathname.startsWith("/auth/callback");

  if (signedIn && isAuthPage) {
    const url = request.nextUrl.clone();
    url.pathname = "/events";
    return withSessionCookies(NextResponse.redirect(url), refreshedCookies);
  }

  if (!signedIn && !isAuthPage && !isCallback) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return withSessionCookies(NextResponse.redirect(url), refreshedCookies);
  }

  return supabaseResponse;
}

function withSessionCookies(
  response: NextResponse,
  cookies: { name: string; value: string; options: CookieOptions }[]
) {
  for (const { name, value, options } of cookies) {
    response.cookies.set(name, value, options);
  }

  return response;
}
