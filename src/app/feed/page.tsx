import { Suspense } from "react";
import { AppShell, getAuthenticatedUser } from "@/components/app-shell";
import { FeedView } from "@/components/posts/feed-view";
import { OnThisDayCard } from "@/components/posts/on-this-day-card";
import { BestOfBanner } from "@/components/best-of/best-of-banner";
import { NewPostButton } from "@/components/posts/new-post-button";
import { StoriesRow } from "@/components/posts/stories-row";
import { createClient } from "@/lib/supabase/server";
import { loadPostPage } from "@/lib/posts-data";
import { loadStories } from "@/lib/stories-data";
import { Skeleton } from "@/components/ui/skeleton";

type ServerClient = Awaited<ReturnType<typeof createClient>>;

export default async function PostPage() {
  const { user, displayName } = await getAuthenticatedUser();
  const supabase = await createClient();
  const [eventOptionsResult, stories] = await Promise.all([
    supabase
      .from("events")
      .select("id,title,starts_at")
      .gte(
        "starts_at",
        new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
      )
      .order("starts_at", { ascending: true })
      .limit(50),
    loadStories(supabase, user.id),
  ]);
  const eventOptions = (eventOptionsResult.data ?? []).map((event) => ({
    id: String(event.id),
    title: String(event.title),
    startsAt: String(event.starts_at),
  }));

  return (
    <AppShell userId={user.id}>
      <section className="space-y-8">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-[22px] font-bold leading-tight text-text">
            Post
          </h1>

          <NewPostButton userId={user.id} events={eventOptions} />
        </div>

        <StoriesRow groups={stories.groups} viewer={stories.viewer} />

        <BestOfBanner />

        <OnThisDayCard />

        <Suspense fallback={<FeedSkeleton />}>
          <FeedSection
            supabase={supabase}
            userId={user.id}
            displayName={displayName}
          />
        </Suspense>
      </section>
    </AppShell>
  );
}

async function FeedSection({
  supabase,
  userId,
  displayName,
}: {
  supabase: ServerClient;
  userId: string;
  displayName: string;
}) {
  const page = await loadPostPage(supabase, userId, displayName, 0);

  if (page.error) {
    return <p className="text-sm text-muted">{page.error}</p>;
  }

  return (
    <FeedView
      key={page.posts[0]?.id ?? "empty"}
      initialPosts={page.posts}
      initialHasMore={page.hasMore}
    />
  );
}

function FeedSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading posts">
      {[0, 1].map((index) => (
        <div key={index} className="space-y-3" aria-hidden="true">
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-full" />
            <Skeleton className="h-4 w-32 rounded" />
          </div>
          <Skeleton className="h-64 rounded-lg" />
          <Skeleton className="h-4 w-2/3 rounded" />
        </div>
      ))}
    </div>
  );
}
