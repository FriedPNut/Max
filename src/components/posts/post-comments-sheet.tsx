"use client";

import Link from "next/link";
import { X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { CommentMenu } from "@/components/posts/comment-menu";
import { Avatar, Button, Input, Sheet, Skeleton } from "@/components/ui";
import { resolveProfileAvatarUrls } from "@/lib/profile-data";
import {
  COMMENT_MAX,
  nameInitial,
  relativeTime,
  type PostComment,
  type PostProfile,
} from "@/lib/posts";
import { createClient } from "@/lib/supabase/client";

type CommentRow = {
  id: string;
  post_id: string;
  user_id: string;
  body: string;
  created_at: string;
};

type CurrentUser = {
  id: string;
  name: string;
  username: string | null;
  avatarUrl: string | null;
};

function sortComments(comments: PostComment[]) {
  return [...comments].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export function PostCommentsSheet({
  postId,
  postAuthorId,
  initialCount,
  onClose,
  onCountChange,
}: {
  postId: string;
  postAuthorId: string;
  initialCount: number;
  onClose: () => void;
  onCountChange: (count: number) => void;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [comments, setComments] = useState<PostComment[]>([]);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        const currentUserId = session?.user.id ?? "";
        const authorIds = new Set<string>();

        if (currentUserId) {
          authorIds.add(currentUserId);
        }

        const { data: commentData, error: commentsError } = await supabase
          .from("post_comments")
          .select("id,post_id,user_id,body,created_at")
          .eq("post_id", postId)
          .order("created_at", { ascending: true })
          .order("id", { ascending: true });

        if (!active) {
          return;
        }

        if (commentsError) {
          setError("Couldn't load comments. Try again.");
          setLoading(false);
          return;
        }

        const rows = (commentData ?? []) as CommentRow[];

        for (const row of rows) {
          authorIds.add(row.user_id);
        }

        let profiles: PostProfile[] = [];

        if (authorIds.size > 0) {
          const { data: profileData } = await supabase
            .from("profiles")
            .select("id,display_name,avatar_url,username")
            .in("id", [...authorIds]);

          profiles = (profileData ?? []) as PostProfile[];
        }

        const profilesById = new Map(
          profiles.map((profile) => [profile.id, profile])
        );
        const avatarUrls = await resolveProfileAvatarUrls(supabase, profiles);

        if (!active) {
          return;
        }

        const ownProfile = profilesById.get(currentUserId);
        const ownName =
          ownProfile?.display_name?.trim() ||
          ownProfile?.username?.trim() ||
          "You";

        setCurrentUser(
          currentUserId
            ? {
                id: currentUserId,
                name: ownName,
                username: ownProfile?.username?.trim() || null,
                avatarUrl: avatarUrls.get(currentUserId) ?? null,
              }
            : null
        );

        setComments(
          rows.map((row) => {
            const profile = profilesById.get(row.user_id);
            const name =
              profile?.display_name?.trim() ||
              profile?.username?.trim() ||
              (row.user_id === currentUserId ? ownName : "A friend");

            return {
              id: row.id,
              postId: row.post_id,
              body: row.body,
              createdAt: row.created_at,
              relativeTime: relativeTime(row.created_at),
              authorId: row.user_id,
              authorName: name,
              authorInitial: nameInitial(name),
              authorUsername: profile?.username?.trim() || null,
              authorAvatarUrl: avatarUrls.get(row.user_id) ?? null,
              canDelete:
                row.user_id === currentUserId || postAuthorId === currentUserId,
            };
          })
        );
        setLoaded(true);
        setLoading(false);
      } catch {
        if (active) {
          setError("Couldn't load comments. Try again.");
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      active = false;
    };
  }, [postId, postAuthorId, supabase]);

  useEffect(() => {
    if (!loaded) {
      return;
    }

    onCountChange(comments.length);
  }, [comments.length, loaded, onCountChange]);

  useEffect(() => {
    const channel = supabase
      .channel(`feed-post-comments-${postId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "post_comments",
          filter: `post_id=eq.${postId}`,
        },
        async (payload) => {
          const row = payload.new as CommentRow;

          if (row.user_id === currentUser?.id) {
            setComments((current) =>
              current.some((comment) => comment.id === row.id)
                ? current
                : sortComments([
                    ...current,
                    {
                      id: row.id,
                      postId: row.post_id,
                      body: row.body,
                      createdAt: row.created_at,
                      relativeTime: relativeTime(row.created_at),
                      authorId: row.user_id,
                      authorName: currentUser.name,
                      authorInitial: nameInitial(currentUser.name),
                      authorUsername: currentUser.username,
                      authorAvatarUrl: currentUser.avatarUrl,
                      canDelete: true,
                    },
                  ])
            );
            return;
          }

          const { data } = await supabase
            .from("profiles")
            .select("id,display_name,username")
            .eq("id", row.user_id)
            .maybeSingle();
          const name =
            (data?.display_name as string | null)?.trim() ||
            (data?.username as string | null)?.trim() ||
            "A friend";
          const username = (data?.username as string | null)?.trim() || null;

          setComments((current) =>
            current.some((comment) => comment.id === row.id)
              ? current
              : sortComments([
                  ...current,
                  {
                    id: row.id,
                    postId: row.post_id,
                    body: row.body,
                    createdAt: row.created_at,
                    relativeTime: relativeTime(row.created_at),
                    authorId: row.user_id,
                    authorName: name,
                    authorInitial: nameInitial(name),
                    authorUsername: username,
                    authorAvatarUrl: null,
                    canDelete: postAuthorId === currentUser?.id,
                  },
                ])
          );
        }
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "post_comments",
          filter: `post_id=eq.${postId}`,
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
  }, [currentUser, postAuthorId, postId, supabase]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = body.trim().slice(0, COMMENT_MAX);

    if (!text || sending || !currentUser) {
      return;
    }

    setSending(true);
    setError(null);

    try {
      const { data, error: insertError } = await supabase
        .from("post_comments")
        .insert({ post_id: postId, user_id: currentUser.id, body: text })
        .select("id,post_id,user_id,body,created_at")
        .single();

      if (insertError || !data) {
        setError("Couldn't post that comment. Try again.");
        return;
      }

      const row = data as CommentRow;

      setComments((current) =>
        current.some((comment) => comment.id === row.id)
          ? current
          : [
              ...current,
              {
                id: row.id,
                postId: row.post_id,
                body: row.body,
                createdAt: row.created_at,
                relativeTime: relativeTime(row.created_at),
                authorId: row.user_id,
                authorName: currentUser.name,
                authorInitial: nameInitial(currentUser.name),
                authorUsername: currentUser.username,
                authorAvatarUrl: currentUser.avatarUrl,
                canDelete: true,
              },
            ]
      );
      setBody("");
    } catch {
      setError("Couldn't post that comment. Try again.");
    } finally {
      setSending(false);
    }
  }

  async function handleDelete(commentId: string) {
    if (deletingId) {
      return;
    }

    setDeletingId(commentId);
    setError(null);

    try {
      const { data, error: deleteError } = await supabase
        .from("post_comments")
        .delete()
        .eq("id", commentId)
        .select("id");

      if (deleteError || !data || data.length === 0) {
        setError(
          deleteError
            ? "Couldn't delete that comment. Try again."
            : "That comment can't be deleted."
        );
        return;
      }

      setComments((current) =>
        current.filter((comment) => comment.id !== commentId)
      );
      setConfirmingId(null);
    } catch {
      setError("Couldn't delete that comment. Try again.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <Sheet label="Comments" onClose={onClose}>
      <div className="flex h-[72dvh] flex-col">
        <div className="flex items-center gap-3 border-b border-line pb-2">
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-semibold text-text">Comments</h2>
            <p className="text-xs text-muted">
              {loaded ? comments.length : initialCount}{" "}
              {(loaded ? comments.length : initialCount) === 1
                ? "comment"
                : "comments"}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close comments"
            className="inline-flex h-11 w-11 -mr-2 items-center justify-center text-text transition-opacity duration-200 ease-out hover:opacity-70"
          >
            <X size={24} strokeWidth={1.75} aria-hidden="true" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto py-3">
          {loading ? (
            <div className="space-y-5" aria-busy="true" aria-label="Loading comments">
              {[0, 1, 2].map((index) => (
                <div key={index} className="flex gap-3" aria-hidden="true">
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-3 w-28 rounded" />
                    <Skeleton className="h-3 w-3/4 rounded" />
                  </div>
                </div>
              ))}
            </div>
          ) : comments.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted">
              No comments yet. Start the conversation.
            </p>
          ) : (
            <ul className="space-y-4">
              {comments.map((comment) => (
                <li key={comment.id} className="flex gap-3">
                  <Avatar
                    src={comment.authorAvatarUrl}
                    initial={comment.authorInitial}
                    size={32}
                  />

                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-2">
                      {comment.authorUsername ? (
                        <Link
                          href={`/u/${encodeURIComponent(
                            comment.authorUsername
                          )}`}
                          className="truncate text-[14px] font-semibold text-text transition-opacity duration-200 ease-out hover:opacity-70"
                        >
                          {comment.authorName}
                        </Link>
                      ) : (
                        <span className="truncate text-[14px] font-semibold text-text">
                          {comment.authorName}
                        </span>
                      )}
                    </div>

                    <p className="mt-0.5 whitespace-pre-wrap break-words text-base text-text">
                      {comment.body}
                    </p>

                    <p className="mt-1 text-xs text-muted">
                      {comment.relativeTime}
                    </p>

                    {confirmingId === comment.id && (
                      <div className="mt-2 space-y-2">
                        <p className="text-sm text-text">
                          Delete this comment?
                        </p>
                        <div className="flex gap-2">
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => void handleDelete(comment.id)}
                            disabled={deletingId !== null}
                          >
                            {deletingId === comment.id
                              ? "Deleting..."
                              : "Delete"}
                          </Button>
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => setConfirmingId(null)}
                            disabled={deletingId !== null}
                          >
                            Cancel
                          </Button>
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
        </div>

        <form
          onSubmit={handleSubmit}
          className="shrink-0 border-t border-line bg-surface pt-3 pb-[calc(env(safe-area-inset-bottom,0px)+4px)]"
        >
          <div className="flex items-center gap-2">
            <Input
              type="text"
              value={body}
              onChange={(event) => setBody(event.target.value)}
              maxLength={COMMENT_MAX}
              placeholder="Add a comment..."
              aria-label="Add a comment"
              enterKeyHint="send"
              autoComplete="off"
              pill
              className="min-w-0 flex-1"
            />

            <Button
              type="submit"
              variant="text"
              size="sm"
              disabled={
                sending || !currentUser || body.trim().length === 0
              }
              className="shrink-0"
            >
              {sending ? "Posting..." : "Post"}
            </Button>
          </div>

          {error && (
            <p role="alert" className="mt-2 text-sm text-text">
              {error}
            </p>
          )}
        </form>
      </div>
    </Sheet>
  );
}
