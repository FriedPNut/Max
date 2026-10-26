"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { CommentMenu } from "@/components/posts/comment-menu";
import { PostCard } from "@/components/posts/post-card";
import { ProfileAvatar } from "@/components/profile/profile-avatar";
import { createClient } from "@/lib/supabase/client";
import {
  COMMENT_MAX,
  nameInitial,
  relativeTime,
  type FeedPost,
  type PostComment,
} from "@/lib/posts";

type CommentRow = {
  id: string;
  post_id: string;
  user_id: string;
  body: string;
  created_at: string;
};

function sortByCreatedAt(comments: PostComment[]) {
  return [...comments].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export function PostDetail({
  post,
  initialComments,
  currentUserId,
  currentUserName,
  currentUserUsername,
}: {
  post: FeedPost;
  initialComments: PostComment[];
  currentUserId: string;
  currentUserName: string;
  currentUserUsername: string | null;
}) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [comments, setComments] = useState<PostComment[]>(initialComments);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  function toComment(
    row: CommentRow,
    name: string,
    username: string | null,
    avatarUrl: string | null
  ): PostComment {
    return {
      id: row.id,
      postId: row.post_id,
      body: row.body,
      createdAt: row.created_at,
      relativeTime: relativeTime(row.created_at),
      authorId: row.user_id,
      authorName: name,
      authorInitial: nameInitial(name),
      authorUsername: username,
      authorAvatarUrl: avatarUrl,
      canDelete: row.user_id === currentUserId || post.isOwner,
    };
  }

  function mergeComment(comment: PostComment) {
    setComments((current) =>
      current.some((item) => item.id === comment.id)
        ? current
        : sortByCreatedAt([...current, comment])
    );
  }

  // New comments from anyone appear live; deletes from other devices drop out too.
  useEffect(() => {
    const channel = supabase
      .channel(`post-comments-${post.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "post_comments",
          filter: `post_id=eq.${post.id}`,
        },
        async (payload) => {
          const row = payload.new as CommentRow;

          if (row.user_id === currentUserId) {
            mergeComment(
              toComment(row, currentUserName, currentUserUsername, null)
            );
            return;
          }

          const { data } = await supabase
            .from("profiles")
            .select("display_name,username")
            .eq("id", row.user_id)
            .maybeSingle();
          const username = (data?.username as string | null)?.trim() || null;
          const name =
            (data?.display_name as string | null)?.trim() ||
            username ||
            "A friend";

          mergeComment(toComment(row, name, username, null));
        }
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "post_comments",
          filter: `post_id=eq.${post.id}`,
        },
        (payload) => {
          const removed = (payload.old as { id?: string }).id;

          if (removed) {
            setComments((current) =>
              current.filter((comment) => comment.id !== removed)
            );
          }
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
    // toComment/mergeComment only read the values listed here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    currentUserId,
    currentUserName,
    currentUserUsername,
    post.id,
    post.isOwner,
    supabase,
  ]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = body.trim().slice(0, COMMENT_MAX);

    if (!text || sending) {
      return;
    }

    setSending(true);
    setError(null);

    const { data, error: insertError } = await supabase
      .from("post_comments")
      .insert({ post_id: post.id, user_id: currentUserId, body: text })
      .select("id,post_id,user_id,body,created_at")
      .single();

    if (insertError || !data) {
      setError("Couldn't post that comment. Try again.");
      setSending(false);
      return;
    }

    mergeComment(
      toComment(data as CommentRow, currentUserName, currentUserUsername, null)
    );
    setBody("");
    setSending(false);
  }

  async function handleDelete(commentId: string) {
    if (deletingId) {
      return;
    }

    setDeletingId(commentId);
    setError(null);

    const { data, error: deleteError } = await supabase
      .from("post_comments")
      .delete()
      .eq("id", commentId)
      .select("id");

    if (deleteError) {
      setError("Couldn't delete that comment. Try again.");
      setDeletingId(null);
      return;
    }

    if (!data || data.length === 0) {
      setError("That comment can't be deleted.");
      setDeletingId(null);
      return;
    }

    setComments((current) =>
      current.filter((comment) => comment.id !== commentId)
    );
    setConfirmingId(null);
    setDeletingId(null);
  }

  return (
    <div>
      <PostCard
        post={post}
        onDeleted={() => router.push("/feed")}
        showComments={false}
      />

      <section className="space-y-2 border-b border-line py-6">
        <h2 className="text-lg font-semibold text-text">Comments</h2>

        {comments.length === 0 ? (
          <p className="text-sm text-muted">No comments yet.</p>
        ) : (
          <ul className="divide-y divide-line border-t border-line">
            {comments.map((comment) => (
              <li key={comment.id} className="flex gap-3 py-3">
                <ProfileAvatar
                  src={comment.authorAvatarUrl}
                  initial={comment.authorInitial}
                  size={32}
                />

                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2">
                    {comment.authorUsername ? (
                      <Link
                        href={`/u/${encodeURIComponent(comment.authorUsername)}`}
                        className="truncate text-sm font-medium text-text transition-opacity duration-150 ease-out hover:opacity-80"
                      >
                        {comment.authorName}
                      </Link>
                    ) : (
                      <span className="truncate text-sm font-medium text-text">
                        {comment.authorName}
                      </span>
                    )}
                    <span className="shrink-0 text-sm text-muted">
                      {comment.relativeTime}
                    </span>
                  </div>

                  <p className="mt-0.5 whitespace-pre-wrap break-words text-base text-text">
                    {comment.body}
                  </p>

                  {confirmingId === comment.id && (
                    <div className="mt-2 space-y-2">
                      <p className="text-sm text-text">Delete this comment?</p>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => void handleDelete(comment.id)}
                          disabled={deletingId !== null}
                          className="min-h-11 rounded-lg bg-text px-4 py-3 text-sm font-medium text-background transition-opacity duration-150 ease-out hover:opacity-90 disabled:pointer-events-none disabled:opacity-60 cursor-pointer"
                        >
                          {deletingId === comment.id ? "Deleting..." : "Delete"}
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmingId(null)}
                          disabled={deletingId !== null}
                          className="min-h-11 rounded-lg border border-border px-4 py-3 text-sm font-medium text-text transition-colors duration-150 ease-out hover:bg-surface disabled:pointer-events-none disabled:opacity-60 cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {comment.canDelete && confirmingId !== comment.id && (
                  <CommentMenu
                    onDeleteRequested={() => {
                      setError(null);
                      setConfirmingId(comment.id);
                    }}
                  />
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="h-24" aria-hidden="true" />

      <div
        className="fixed inset-x-0 z-30 border-t border-line bg-background"
        style={{ bottom: "calc(56px + env(safe-area-inset-bottom, 0px))" }}
      >
        <form
          onSubmit={handleSubmit}
          className="mx-auto flex w-full max-w-[560px] items-center gap-2 px-4 py-3"
        >
          <input
            type="text"
            value={body}
            onChange={(event) => setBody(event.target.value)}
            maxLength={COMMENT_MAX}
            placeholder="Add a comment"
            aria-label="Add a comment"
            enterKeyHint="send"
            autoComplete="off"
            className="min-w-0 flex-1 rounded-lg border border-border bg-surface px-3 py-3 text-base leading-snug text-text placeholder:text-muted focus:outline-2 focus:outline-offset-0 focus:outline-text"
          />

          <button
            type="submit"
            disabled={sending || body.trim().length === 0}
            className="min-h-11 shrink-0 rounded-lg bg-text px-4 py-3 text-sm font-medium text-background transition-opacity duration-150 ease-out hover:opacity-90 disabled:pointer-events-none disabled:opacity-60 cursor-pointer"
          >
            {sending ? "Adding..." : "Send"}
          </button>
        </form>

        {error && (
          <p
            role="alert"
            className="mx-auto max-w-[560px] px-4 pb-2 text-sm text-text"
          >
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
