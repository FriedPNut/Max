"use client";

import Link from "next/link";
import {
  Fragment,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { LocalTime } from "@/components/local-time";
import { createClient } from "@/lib/supabase/client";
import type { ChatMember, MessageRecord } from "@/lib/chat";

const PAGE_SIZE = 30;
const TIMESTAMP_GAP_MS = 30 * 60 * 1000;

export function ChatRoom({
  conversationId,
  currentUserId,
  isGroup,
  members,
  initialMessages,
  initialHasMore,
}: {
  conversationId: string;
  currentUserId: string;
  isGroup: boolean;
  members: ChatMember[];
  initialMessages: MessageRecord[];
  initialHasMore: boolean;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [messages, setMessages] = useState<MessageRecord[]>(initialMessages);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [olderError, setOlderError] = useState<string | null>(null);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const topRef = useRef<HTMLDivElement>(null);
  const loadingOlderRef = useRef(false);
  const shouldScrollToBottom = useRef(true);
  const prependSnapshot = useRef<{ height: number; top: number } | null>(null);

  const namesById = useMemo(() => {
    return new Map(members.map((member) => [member.id, member.name]));
  }, [members]);
  const usernamesById = useMemo(() => {
    return new Map(
      members.map((member) => [member.id, member.username] as const)
    );
  }, [members]);

  const markRead = useCallback(async () => {
    await supabase
      .from("conversation_members")
      .update({ last_read_at: new Date().toISOString() })
      .eq("conversation_id", conversationId)
      .eq("user_id", currentUserId);
  }, [conversationId, currentUserId, supabase]);

  useEffect(() => {
    void markRead();
  }, [markRead]);

  useEffect(() => {
    const channel = supabase
      .channel(`conversation-${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const message = payload.new as MessageRecord;
          const nearBottom =
            window.scrollY + window.innerHeight >=
            document.documentElement.scrollHeight - 160;

          if (nearBottom) {
            shouldScrollToBottom.current = true;
          }

          setMessages((current) => {
            if (current.some((existing) => existing.id === message.id)) {
              return current;
            }

            return [...current, message];
          });

          void markRead();
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [conversationId, markRead, supabase]);

  useLayoutEffect(() => {
    const snapshot = prependSnapshot.current;

    if (snapshot) {
      prependSnapshot.current = null;
      const difference =
        document.documentElement.scrollHeight - snapshot.height;

      if (difference > 0) {
        window.scrollTo({ top: snapshot.top + difference });
      }

      return;
    }

    if (shouldScrollToBottom.current) {
      shouldScrollToBottom.current = false;
      bottomRef.current?.scrollIntoView({ block: "end" });
    }
  }, [messages]);

  const loadOlder = useCallback(async () => {
    if (loadingOlderRef.current || !hasMore) {
      return;
    }

    const oldest = messages[0];

    if (!oldest) {
      setHasMore(false);
      return;
    }

    loadingOlderRef.current = true;
    setLoadingOlder(true);
    setOlderError(null);

    const { data, error: olderLoadError } = await supabase
      .from("messages")
      .select("id,conversation_id,user_id,body,created_at")
      .eq("conversation_id", conversationId)
      .lt("created_at", oldest.created_at)
      .order("created_at", { ascending: false })
      .limit(PAGE_SIZE);

    if (olderLoadError) {
      loadingOlderRef.current = false;
      setLoadingOlder(false);
      setOlderError("Couldn't load older messages.");
      return;
    }

    const older = ((data ?? []) as MessageRecord[]).slice().reverse();

    if (older.length > 0) {
      prependSnapshot.current = {
        height: document.documentElement.scrollHeight,
        top: window.scrollY,
      };

      setMessages((current) => {
        const existingIds = new Set(current.map((message) => message.id));
        const freshOlder = older.filter(
          (message) => !existingIds.has(message.id)
        );

        return [...freshOlder, ...current];
      });
    }

    setHasMore(older.length === PAGE_SIZE);
    loadingOlderRef.current = false;
    setLoadingOlder(false);
  }, [conversationId, hasMore, messages, supabase]);

  useEffect(() => {
    if (!hasMore) {
      return;
    }

    const node = topRef.current;

    if (!node) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          void loadOlder();
        }
      },
      { rootMargin: "240px 0px 0px 0px" }
    );

    observer.observe(node);

    return () => observer.disconnect();
  }, [hasMore, loadOlder]);

  async function handleSend(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = body.trim();

    if (!text || sending) {
      return;
    }

    setSending(true);
    setError(null);

    const { data, error: sendError } = await supabase
      .from("messages")
      .insert({
        conversation_id: conversationId,
        user_id: currentUserId,
        body: text,
      })
      .select("id,conversation_id,user_id,body,created_at")
      .single();

    if (sendError || !data) {
      setError("Couldn't send that message. Try again.");
      setSending(false);
      return;
    }

    shouldScrollToBottom.current = true;
    setMessages((current) => {
      if (current.some((existing) => existing.id === data.id)) {
        return current;
      }

      return [...current, data as MessageRecord];
    });
    setBody("");
    setSending(false);
    void markRead();
  }

  return (
    <div>
      <div ref={topRef} className="h-px" aria-hidden="true" />

      {loadingOlder && (
        <p className="pb-2 text-center text-sm text-muted">
          Loading older messages...
        </p>
      )}

      {olderError && (
        <p role="alert" className="pb-2 text-center text-sm text-text">
          {olderError}
        </p>
      )}

      {messages.length === 0 ? (
        <p className="text-sm text-muted">No messages yet.</p>
      ) : (
        <div>
          {messages.map((message, index) => {
            const previous = messages[index - 1];
            const isOwn = message.user_id === currentUserId;
            const startsRun = !previous || previous.user_id !== message.user_id;
            const name =
              namesById.get(message.user_id) ??
              (isOwn ? "You" : "A friend");
            const username = usernamesById.get(message.user_id);
            const showTimestamp =
              !previous ||
              new Date(message.created_at).getTime() -
                new Date(previous.created_at).getTime() >
                TIMESTAMP_GAP_MS;

            return (
              <Fragment key={message.id}>
                {showTimestamp && (
                  <p className="my-3 text-center text-sm text-muted">
                    <LocalTime iso={message.created_at} format="card" />
                  </p>
                )}

                <div
                  className={`flex flex-col ${
                    isOwn ? "items-end" : "items-start"
                  } ${index === 0 ? "" : startsRun ? "mt-3" : "mt-1"}`}
                >
                  {isGroup && startsRun && (
                    username ? (
                      <Link
                        href={`/u/${username}`}
                        className="mb-1 text-[13px] text-muted transition-colors duration-150 ease-out hover:text-text"
                      >
                        {name}
                      </Link>
                    ) : (
                      <p className="mb-1 text-[13px] text-muted">{name}</p>
                    )
                  )}

                  <div
                    className={`max-w-[78%] whitespace-pre-wrap break-words rounded-lg px-3 py-2 text-base leading-relaxed ${
                      isOwn
                        ? "bg-text text-white"
                        : "bg-surface border border-line text-text"
                    }`}
                  >
                    {message.body}
                  </div>
                </div>
              </Fragment>
            );
          })}
        </div>
      )}

      <div ref={bottomRef} className="h-36" aria-hidden="true" />

      <div className="fixed inset-x-0 bottom-14 z-30 border-t border-line bg-background">
        <form
          onSubmit={handleSend}
          className="mx-auto flex w-full max-w-[560px] items-center gap-2 px-4 py-3"
        >
          <input
            type="text"
            value={body}
            onChange={(event) => setBody(event.target.value)}
            placeholder="Message"
            aria-label="Message"
            enterKeyHint="send"
            autoComplete="off"
            className="min-w-0 flex-1 bg-surface text-text placeholder:text-muted border border-line rounded-lg px-3 py-3 text-base leading-snug focus:outline-2 focus:outline-offset-0 focus:outline-text"
          />

          <button
            type="submit"
            disabled={sending || body.trim().length === 0}
            className="shrink-0 min-h-11 px-4 py-3 rounded-lg bg-text text-white font-sans font-medium text-sm transition-opacity duration-150 ease-out hover:opacity-90 cursor-pointer disabled:opacity-60 disabled:pointer-events-none"
          >
            {sending ? "Sending..." : "Send"}
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
