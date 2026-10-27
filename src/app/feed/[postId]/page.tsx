import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AppShell, getAuthenticatedUser } from "@/components/app-shell";
import { MissingContent } from "@/components/shell/unavailable";
import { ClearNotificationsOnOpen } from "@/components/notifications/clear-notifications-on-open";
import { PostDetail } from "@/components/posts/post-detail";
import { createClient } from "@/lib/supabase/server";
import { loadPostDetail } from "@/lib/posts-data";

export default async function PostDetailPage({
  params,
}: {
  params: Promise<{ postId: string }>;
}) {
  const { postId } = await params;
  const { user, displayName } = await getAuthenticatedUser();
  const supabase = await createClient();
  const [result, myProfile] = await Promise.all([
    loadPostDetail(supabase, postId, user.id, displayName),
    supabase.from("profiles").select("username").eq("id", user.id).maybeSingle(),
  ]);
  const myUsername = (myProfile.data?.username as string | null)?.trim() || null;

  return (
    <AppShell userId={user.id}>
      <section key={postId} className="space-y-6">
        <ClearNotificationsOnOpen kind="post" id={postId} />

        <Link
          href="/feed"
          className="inline-flex min-h-11 items-center gap-1.5 text-sm text-muted transition-colors duration-200 ease-out hover:text-text"
        >
          <ArrowLeft size={24} strokeWidth={1.75} aria-hidden="true" />
          Feed
        </Link>

        {"gone" in result ? (
          <MissingContent tab="post" />
        ) : "error" in result ? (
          <p className="text-sm text-muted">{result.error}</p>
        ) : (
          <PostDetail
            post={result.post}
            initialComments={result.comments}
            commentsError={result.commentsError}
            currentUserId={user.id}
            currentUserName={displayName}
            currentUserUsername={myUsername}
          />
        )}
      </section>
    </AppShell>
  );
}
