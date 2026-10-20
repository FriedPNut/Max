import { AppShell, getAuthenticatedUser } from "@/components/app-shell";
import { FeedView } from "@/components/posts/feed-view";
import { NewPostButton } from "@/components/posts/new-post-button";
import { createClient } from "@/lib/supabase/server";
import { loadPostPage } from "@/lib/posts-data";

export default async function PostPage() {
  const { user, displayName } = await getAuthenticatedUser();
  const supabase = await createClient();
  const [page, eventOptionsResult] = await Promise.all([
    loadPostPage(supabase, user.id, displayName, 0),
    supabase
      .from("events")
      .select("id,title,starts_at")
      .gte("starts_at", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
      .order("starts_at", { ascending: true }),
  ]);
  const eventOptions = (eventOptionsResult.data ?? []).map((event) => ({
    id: String(event.id),
    title: String(event.title),
    startsAt: String(event.starts_at),
  }));

  return (
    <AppShell>
      <section className="space-y-8">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-[28px] font-semibold leading-tight text-text">
            Post
          </h1>

          <NewPostButton userId={user.id} events={eventOptions} />
        </div>

        {page.error ? (
          <p className="text-sm text-muted">{page.error}</p>
        ) : (
          <FeedView
            key={page.posts[0]?.id ?? "empty"}
            initialPosts={page.posts}
            initialHasMore={page.hasMore}
          />
        )}
      </section>
    </AppShell>
  );
}
