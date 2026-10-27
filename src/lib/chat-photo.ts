import type { createClient } from "@/lib/supabase/server";
import { PHOTO_BUCKET, photoThumbPath, photoUrls } from "@/lib/photo-urls";

type ServerClient = Awaited<ReturnType<typeof createClient>>;

export const CONVERSATION_PHOTO_PREFIX = "conversations/";

/**
 * Group photos live in the shared photos bucket and follow the same thumbnail
 * rule as every other photo: `foo.jpg` renders from `foo_t.jpg`. One batched
 * signing call covers whole lists of chats.
 */
export async function resolveConversationPhotoUrls(
  supabase: ServerClient,
  paths: (string | null | undefined)[]
): Promise<Map<string, string>> {
  const clean = [...new Set(paths.map((path) => path?.trim()).filter(Boolean))] as string[];
  const result = new Map<string, string>();

  if (clean.length === 0) {
    return result;
  }

  const { urls } = await photoUrls(supabase, PHOTO_BUCKET, clean);

  for (const path of clean) {
    const url = urls.get(photoThumbPath(path)) ?? urls.get(path);

    if (url) {
      result.set(path, url);
    }
  }

  return result;
}

/** Server-side guard for the path a client just uploaded. */
export function isConversationPhotoPath(path: unknown) {
  const value = String(path ?? "").trim();

  return (
    value.startsWith(CONVERSATION_PHOTO_PREFIX) &&
    !value.includes("..") &&
    value.length < 300 &&
    /\.(jpe?g|png|webp)$/i.test(value)
  );
}
