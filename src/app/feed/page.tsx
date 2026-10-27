import { Suspense } from "react";
import { AppShell, getAuthenticatedUser } from "@/components/app-shell";
import { FeedView } from "@/components/posts/feed-view";
import { OnThisDayCard } from "@/components/posts/on-this-day-card";
import { BestOfBanner } from "@/components/best-of/best-of-banner";
import { CreatePostSheetButton } from "@/components/posts/create-sheet";
import { createClient } from "@/lib/supabase/server";
import { loadPostPage } from "@/lib/posts-data";
import { Skeleton } from "@/components/ui/skeleton";
import { serverNow } from "@/lib/server-now";
import { logDataLoad, startDataTimer } from "@/lib/perf-server";

type ServerClient = Awaited<ReturnType<typeof createClient>>;

export default async function PostPage() {
  const dataStartedAt = startDataTimer();
  const { user, displayName } = await getAuthenticatedUser();
  const supabase = await createClient();
  const now = await serverNow();
  logDataLoad("/feed", dataStartedAt);

  return (
    <AppShell
      userId={user.id}
      actions={<CreatePostSheetButton />}
    >
      <section className="space-y-8">
        <BestOfBanner />

        <OnThisDayCard userId={user.id} />

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
      userId={userId}
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
