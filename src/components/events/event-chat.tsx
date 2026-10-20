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
import { useActiveEventTab } from "@/components/events/event-tabs";
import { createClient } from "@/lib/supabase/client";
import {
  EVENT_CHAT_PAGE_SIZE,
  type EventChatProfile,
  type EventMessageRecord,
} from "@/lib/event-chat";

type ProfileRow = {
  id: string;
  display_name: string | null;
  username: string | null;
};

function sortMessages(messages: EventMessageRecord[]) {
  return [...messages].sort((a, b) => {
    const byDate = a.created_at.localeCompare(b.created_at);
    return byDate !== 0 ? byDate : a.id.localeCompare(b.id);
  });
}

function mergeMessages(
  current: EventMessageRecord[],
  incoming: EventMessageRecord[]
) {
  const byId = new Map(current.map((message) => [message.id, message]));

  for (const message of incoming) {
    byId.set(message.id, message);
  }

  return sortMessages([...byId.values()]);
}

export function EventChat({
  eventId,
  currentUserId,
  currentUserName,
  initialMessages,
  initialProfiles,
  initialHasMore,
  initialError,
}: {
  eventId: string;
  currentUserId: string;
  currentUserName: string;
  initialMessages: EventMessageRecord[];
  initialProfiles: EventChatProfile[];
  initialHasMore: boolean;
  initialError?: string;
}) {
  const supabase = useMemo(() => createClient(), []);
  const activeTab = useActiveEventTab();
  const isActive = activeTab === "chat";
  const [messages, setMessages] = useState(() => sortMessages(initialMessages));
  const [profilesById, setProfilesById] = useState<
    Record<string, EventChatProfile>
  >(() =>
    Object.fromEntries(initialProfiles.map((profile) => [profile.id, profile]))
  );
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [olderError, setOlderError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(
    initialError ?? null
  );
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const profilesRef = useRef(profilesById);
  const loadingNamesRef = useRef(new Set<string>());
  const activeRef = useRef(isActive);
  const bottomRef = useRef<HTMLDivElement>(null);
  const topRef = useRef<HTMLDivElement>(null);
  const loadingOlderRef = useRef(false);
  const shouldScrollToBottom = useRef(true);
  const prependSnapshot = useRef<{ height: number; top: number } | null>(null);
  const wasActive = useRef(false);

  useEffect(() => {
    activeRef.current = isActive;
  }, [isActive]);

  const loadNames = useCallback(
    async (userIds: string[]) => {
      const missing = [...new Set(userIds)].filter(
        (userId) =>
          !profilesRef.current[userId] && !loadingNamesRef.current.has(userId)
      );

      if (missing.length === 0) {
        return;
      }

      for (const userId of missing) {
        loadingNamesRef.current.add(userId);
      }

      let rows: ProfileRow[] = [];

      try {
        const { data } = await supabase
          .from("profiles")
          .select("id,display_name,username")
          .in("id", missing);

        rows = (data ?? []) as ProfileRow[];
      } catch {
        rows = [];
      }

      const rowsById = new Map(rows.map((profile) => [profile.id, profile]));
      const next = { ...profilesRef.current };

      for (const userId of missing) {
        const profile = rowsById.get(userId);
        const username = profile?.username?.trim() || null;
        const name =
          profile?.display_name?.trim() ||
          username ||
          (userId === currentUserId ? currentUserName : "A friend");

        next[userId] = { id: userId, name, username };
        loadingNamesRef.current.delete(userId);
      }

      profilesRef.current = next;
      setProfilesById(next);
    },
    [currentUserId, currentUserName, supabase]
  );

  useEffect(() => {
    const channel = supabase
      .channel(`event-messages-${eventId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "event_messages",
          filter: `event_id=eq.${eventId}`,
        },
        (payload) => {
          const message = payload.new as EventMessageRecord;

          if (message.event_id !== eventId) {
            return;
          }

          if (activeRef.current) {
            const nearBottom =
              window.scrollY + window.innerHeight >=
              document.documentElement.scrollHeight - 180;

            if (nearBottom) {
              shouldScrollToBottom.current = true;
            }
          }

          setLoadError(null);
          setMessages((current) => mergeMessages(current, [message]));
          void loadNames([message.user_id]);
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [eventId, loadNames, supabase]);

  useLayoutEffect(() => {
    if (isActive && !wasActive.current && messages.length > 0) {
      bottomRef.current?.scrollIntoView({ block: "end" });
    }

    wasActive.current = isActive;
  }, [isActive, messages.length]);

  useLayoutEffect(() => {
    if (!isActive) {
      return;
    }

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

    if (messages.length > 0 && shouldScrollToBottom.current) {
      shouldScrollToBottom.current = false;
      bottomRef.current?.scrollIntoView({ block: "end" });
    }
  }, [isActive, messages]);

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
      .from("event_messages")
      .select("id,event_id,user_id,body,created_at")
      .eq("event_id", eventId)
      .lt("created_at", oldest.created_at)
      .order("created_at", { ascending: false })
      .limit(EVENT_CHAT_PAGE_SIZE);

    if (olderLoadError) {
      loadingOlderRef.current = false;
      setLoadingOlder(false);
      setOlderError("Couldn't load older messages.");
      return;
    }

    const older = ((data ?? []) as EventMessageRecord[]).slice().reverse();

    if (older.length > 0) {
      prependSnapshot.current = {
        height: document.documentElement.scrollHeight,
        top: window.scrollY,
      };

      setMessages((current) => mergeMessages(current, older));
      void loadNames(older.map((message) => message.user_id));
    }

    setHasMore(older.length === EVENT_CHAT_PAGE_SIZE);
    loadingOlderRef.current = false;
    setLoadingOlder(false);
  }, [eventId, hasMore, loadNames, messages, supabase]);

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
      .from("event_messages")
      .insert({
        event_id: eventId,
        user_id: currentUserId,
        body: text,
      })
      .select("id,event_id,user_id,body,created_at")
      .single();

    if (sendError || !data) {
      setError("Couldn't send that message. Try again.");
      setSending(false);
      return;
    }

    shouldScrollToBottom.current = true;
    setLoadError(null);
    setMessages((current) =>
      mergeMessages(current, [data as EventMessageRecord])
    );
    void loadNames([currentUserId]);
    setBody((current) => (current.trim() === text ? "" : current));
    setSending(false);
  }

  async function handleDelete(messageId: string) {
    if (deletingId !== null) {
      return;
    }

    setDeletingId(messageId);
    setError(null);

    const { data, error: deleteError } = await supabase
      .from("event_messages")
      .delete()
      .eq("id", messageId)
      .eq("event_id", eventId)
      .eq("user_id", currentUserId)
      .select("id");

    if (deleteError || !data || data.length === 0) {
      setError("Couldn't delete that message. Try again.");
      setDeletingId(null);
      return;
    }

    setMessages((current) =>
      current.filter((message) => message.id !== messageId)
    );
    setDeletingId(null);
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

      {loadError && messages.length === 0 ? (
        <p role="alert" className="text-sm text-text">
          {loadError}
        </p>
      ) : messages.length === 0 ? (
        <p className="text-sm text-muted">No messages yet.</p>
      ) : (
        <div>
          {messages.map((message, index) => {
            const previous = messages[index - 1];
            const isOwn = message.user_id === currentUserId;
            const startsRun = !previous || previous.user_id !== message.user_id;
            const profile = profilesById[message.user_id];
            const name =
              profile?.name ||
              (isOwn ? currentUserName : "A friend");
            const username = profile?.username ?? null;

            return (
              <Fragment key={message.id}>
                <div
                  className={`flex flex-col ${
                    isOwn ? "items-end" : "items-start"
                  } ${index === 0 ? "" : startsRun ? "mt-3" : "mt-1"}`}
                >
                  {startsRun &&
                    (username ? (
                      <Link
                        href={`/u/${encodeURIComponent(username)}`}
                        className="mb-1 text-[13px] text-muted transition-colors duration-150 ease-out hover:text-text"
                      >
                        {name}
                      </Link>
                    ) : (
                      <p className="mb-1 text-[13px] text-muted">{name}</p>
                    ))}

                  <div
                    className={`max-w-[78%] whitespace-pre-wrap break-words rounded-lg px-3 py-2 text-base leading-relaxed ${
                      isOwn
                        ? "bg-text text-white"
                        : "border border-line bg-surface text-text"
                    }`}
                  >
                    {message.body}
                  </div>

                  {isOwn && (
                    <button
                      type="button"
                      onClick={() => handleDelete(message.id)}
                      disabled={deletingId !== null}
                      className="mt-1 min-h-11 px-1 text-sm text-muted transition-colors duration-150 ease-out hover:text-text cursor-pointer disabled:opacity-60 disabled:pointer-events-none"
                    >
                      {deletingId === message.id ? "Deleting..." : "Delete"}
                    </button>
                  )}
                </div>
              </Fragment>
            );
          })}
        </div>
      )}

      <div ref={bottomRef} className="h-44" aria-hidden="true" />

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
            className="min-w-0 flex-1 rounded-lg border border-line bg-surface px-3 py-3 text-base leading-snug text-text placeholder:text-muted focus:outline-2 focus:outline-offset-0 focus:outline-text"
          />

          <button
            type="submit"
            disabled={sending || body.trim().length === 0}
            className="min-h-11 shrink-0 rounded-lg bg-text px-4 py-3 text-sm font-medium text-white transition-opacity duration-150 ease-out hover:opacity-90 cursor-pointer disabled:opacity-60 disabled:pointer-events-none"
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
