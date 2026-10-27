import type { createClient } from "@/lib/supabase/server";
import { photoThumbPath } from "@/lib/photo";

type ServerClient = Awaited<ReturnType<typeof createClient>>;

export const PHOTO_BUCKET = "photos";
export const PHOTO_SIGNED_URL_SECONDS = 60 * 60 * 24;

// Reuse a signed URL until two hours before it expires, so the browser sees
// the same URL and serves the photo from its own cache.
const REUSE_WINDOW_MS = 2 * 60 * 60 * 1000;
const MAX_CACHED_URLS = 800;

type CachedUrl = { url: string; expiresAt: number };

const urlCache = new Map<string, CachedUrl>();

export { photoThumbPath };

function cacheKey(bucket: string, path: string) {
  return `${bucket}:${path}`;
}

function remember(key: string, value: CachedUrl) {
  if (urlCache.size >= MAX_CACHED_URLS) {
    const oldest = urlCache.keys().next().value;
    if (oldest) urlCache.delete(oldest);
  }

  urlCache.set(key, value);
}

export function photoUrlsArePublic() {
  return process.env.NEXT_PUBLIC_PHOTOS_PUBLIC === "true";
}

/**
 * Batch-resolve photo paths for storage. Public buckets need no network at
 * all; private buckets are signed in one `createSignedUrls` call, cached in
 * memory per path, and reused until close to expiry.
 */
export async function photoUrls(
  supabase: ServerClient,
  bucket: string,
  paths: string[],
  ttlSeconds = PHOTO_SIGNED_URL_SECONDS
): Promise<{ urls: Map<string, string>; error?: string }> {
  const urls = new Map<string, string>();
  const unique = [...new Set(paths.filter(Boolean))];

  if (unique.length === 0) {
    return { urls };
  }

  if (photoUrlsArePublic()) {
    const storage = supabase.storage.from(bucket);

    for (const path of unique) {
      urls.set(path, storage.getPublicUrl(path).data.publicUrl);
    }

    return { urls };
  }

  // A monotonic timing API, not the wall clock: this cache lives and expires
  // inside one server process, and reading `Date.now()` while a page renders is
  // an unstable value that blocks prerendering.
  const now = performance.now();
  const missing: string[] = [];

  for (const path of unique) {
    const cached = urlCache.get(cacheKey(bucket, path));

    if (cached && cached.expiresAt - now > REUSE_WINDOW_MS) {
      urls.set(path, cached.url);
    } else {
      missing.push(path);
    }
  }

  if (missing.length === 0) {
    return { urls };
  }

  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrls(missing, ttlSeconds);

  if (error) {
    return { urls, error: "Couldn't load photos. Refresh and try again." };
  }

  const expiresAt = now + ttlSeconds * 1000;

  for (const item of data ?? []) {
    if (!item.path || !item.signedUrl) continue;

    urls.set(item.path, item.signedUrl);
    remember(cacheKey(bucket, item.path), {
      url: item.signedUrl,
      expiresAt,
    });
  }

  return { urls };
}
