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
import { useKeyboardInset } from "@/lib/use-keyboard-inset";
import { createClient } from "@/lib/supabase/client";
import {
  MESSAGE_SELECT,
  REACTION_KEYS,
  isReactionKey,
  setReactionPresence,
  type ChatMember,
  type MessageRecord,
  type ReactionKey,
  type ReactionMap,
} from "@/lib/chat";
import {
  deleteMessageAction,
  editMessageAction,
  searchConversationAction,
  setMessagePinAction,
  signChatImagesAction,
} from "@/app/actions/chat-messages";
import { PhotoComposer } from "@/components/chat/photo-composer";
import { ReactionBar, ReactionChip } from "@/components/chat/message-reactions";
import { Search, Smile, X } from "lucide-react";

const PAGE_SIZE = 30;
const TIMESTAMP_GAP_MS = 30 * 60 * 1000;

function MessageMenu({
  open,
  onToggle,
  isPinned,
  onPin,
  isOwn,
  onEdit,
  onDelete,
  hasBody,
  copied,
  onCopy,
}: {
  open: boolean;
  onToggle: () => void;
  isPinned: boolean;
  onPin: () => void;
  isOwn: boolean;
  onEdit: () => void;
  onDelete: () => void;
  hasBody: boolean;
  copied: boolean;
  onCopy: () => void;
}) {
  return (
    <div className="relative" data-message-menu>
      <button
        type="button"
        onClick={onToggle}
        aria-label="Message options"
        aria-expanded={open}
        className="min-h-11 min-w-11 rounded-lg text-muted transition-colors duration-150 ease-out hover:text-text cursor-pointer"
      >
        ...
      </button>
      {open && (
        <div
          data-message-menu
          className="absolute bottom-full right-0 z-20 mb-1 min-w-[140px] rounded-lg border border-border bg-surface py-1"
        >
          {hasBody && (
            <button
              type="button"
              onClick={onCopy}
              className="block min-h-11 w-full px-4 text-left text-sm text-text hover:bg-background cursor-pointer"
            >
              {copied ? "Copied" : "Copy"}
            </button>
          )}
          <button
            type="button"
            onClick={onPin}
            className="block min-h-11 w-full px-4 text-left text-sm text-text hover:bg-background cursor-pointer"
          >
            {isPinned ? "Unpin" : "Pin"}
          </button>
          {isOwn && (
            <>
              <button
                type="button"
                onClick={onEdit}
                className="block min-h-11 w-full px-4 text-left text-sm text-text hover:bg-background cursor-pointer"
              >
                Edit
              </button>
              <button
                type="button"
                onClick={onDelete}
                className="block min-h-11 w-full px-4 text-left text-sm text-text hover:bg-background cursor-pointer"
              >
                Delete
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function renderBody(
  body: string,
  mentionIds: string[] | null,
  members: ChatMember[]
) {
  const usernames = (mentionIds ?? [])
    .map((id) => members.find((m) => m.id === id)?.username)
    .filter((u): u is string => Boolean(u));

  if (usernames.length === 0) {
    return body;
  }

  const pattern = new RegExp(`(@(?:${usernames.map((u) => u.replace(/[^\w]/g, "")).join("|")})\\b)`, "g");

  return body.split(pattern).map((part, index) =>
    index % 2 === 1 ? (
      <strong key={index} className="font-semibold">
        {part}
      </strong>
    ) : (
      part
    )
  );
}

export function ChatRoom({
  conversationId,
  currentUserId,
  isGroup,
  members,
  initialMessages,
  initialHasMore,
  targetMessageId,
}: {
  conversationId: string;
  currentUserId: string;
  isGroup: boolean;
  members: ChatMember[];
  initialMessages: MessageRecord[];
  initialHasMore: boolean;
  targetMessageId?: string | null;
  dmHeaderUserId?: string | null;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [messages, setMessages] = useState<MessageRecord[]>(initialMessages);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [olderError, setOlderError] = useState<string | null>(null);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [typers, setTypers] = useState<Record<string, number>>({});
  const [pinnedIds, setPinnedIds] = useState<string[]>([]);
  const [pinsOpen, setPinsOpen] = useState(false);
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [menuId, setMenuId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [imageUrls, setImageUrls] = useState<Record<string, string>>({});
  const [fullscreenUrl, setFullscreenUrl] = useState<string | null>(null);
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionedIds, setMentionedIds] = useState<string[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<MessageRecord[]>([]);
  const [searchPending, setSearchPending] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [reactions, setReactions] = useState<ReactionMap>({});
  const [reactionBarId, setReactionBarId] = useState<string | null>(null);
  const [whoReacted, setWhoReacted] = useState<{
    messageId: string;
    reaction: ReactionKey;
  } | null>(null);
  const typingChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const openedTargetRef = useRef(false);
  const lastTypingSentRef = useRef(0);
  const bottomRef = useRef<HTMLDivElement>(null);
  const topRef = useRef<HTMLDivElement>(null);
  const loadingOlderRef = useRef(false);
  const shouldScrollToBottom = useRef(true);
  const prependSnapshot = useRef<{ height: number; top: number } | null>(null);
  const fetchedReactionIds = useRef(new Set<string>());
  const loadedMessageIds = useRef(new Set<string>());
  const holdTimer = useRef<number | null>(null);
  const holdStart = useRef<{ x: number; y: number } | null>(null);
  const holdFired = useRef(false);
  const copyTimer = useRef<number | null>(null);
  const roomRef = useRef<HTMLDivElement>(null);
  const keyboardInset = useKeyboardInset();

  // The app shell scrolls `main` instead of the window, so measure that node.
  function getScroller() {
    return roomRef.current?.closest("main") ?? null;
  }

  function pageScrollHeight() {
    const scroller = getScroller();
    return scroller
      ? scroller.scrollHeight
      : document.documentElement.scrollHeight;
  }

  function pageScrollTop() {
    const scroller = getScroller();
    return scroller ? scroller.scrollTop : window.scrollY;
  }

  function pageViewportHeight() {
    const scroller = getScroller();
    return scroller ? scroller.clientHeight : window.innerHeight;
  }

  function setPageScrollTop(top: number) {
    const scroller = getScroller();

    if (scroller) {
      scroller.scrollTop = top;
    } else {
      window.scrollTo({ top });
    }
  }

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

  const jumpRef = useRef<(messageId: string) => Promise<void>>(async () => {});

  useEffect(() => {
    if (!targetMessageId || openedTargetRef.current) {
      return;
    }

    openedTargetRef.current = true;
    shouldScrollToBottom.current = false;
    void jumpRef.current(targetMessageId);
  }, [targetMessageId]);

  useEffect(() => {
    let cancelled = false;

    supabase
      .from("pinned_messages")
      .select("message_id,pinned_at")
      .eq("conversation_id", conversationId)
      .order("pinned_at", { ascending: false })
      .then(({ data }) => {
        if (!cancelled) {
          setPinnedIds(
            ((data ?? []) as { message_id: string }[]).map((row) => row.message_id)
          );
        }
      });

    const channel = supabase
      .channel(`pins-${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "pinned_messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        () => {
          void supabase
            .from("pinned_messages")
            .select("message_id,pinned_at")
            .eq("conversation_id", conversationId)
            .order("pinned_at", { ascending: false })
            .then(({ data }) => {
              setPinnedIds(
                ((data ?? []) as { message_id: string }[]).map(
                  (row) => row.message_id
                )
              );
            });
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      void supabase.removeChannel(channel);
    };
  }, [conversationId, supabase]);

  useEffect(() => {
    const channel = supabase
      .channel(`conversation-${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const updated = payload.new as MessageRecord;
          setMessages((current) =>
            current.map((m) => (m.id === updated.id ? { ...m, ...updated } : m))
          );
        }
      )
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
            pageScrollTop() + pageViewportHeight() >=
            pageScrollHeight() - 160;

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

  useEffect(() => {
    const channel = supabase
      .channel(`typing:${conversationId}`)
      .on("broadcast", { event: "typing" }, (payload) => {
        const userId = String(payload.payload?.user_id ?? "");

        if (!userId || userId === currentUserId) {
          return;
        }

        setTypers((current) => ({ ...current, [userId]: Date.now() }));
      })
      .subscribe();

    typingChannelRef.current = channel;

    const sweep = window.setInterval(() => {
      setTypers((current) => {
        const cutoff = Date.now() - 3000;
        const next = Object.fromEntries(
          Object.entries(current).filter(([, seenAt]) => seenAt > cutoff)
        );

        return Object.keys(next).length === Object.keys(current).length
          ? current
          : next;
      });
    }, 500);

    return () => {
      window.clearInterval(sweep);
      typingChannelRef.current = null;
      void supabase.removeChannel(channel);
    };
  }, [conversationId, currentUserId, supabase]);

  useEffect(() => {
    const missing = messages
      .map((m) => m.image_path)
      .filter((p): p is string => Boolean(p) && !imageUrls[p as string]);

    if (missing.length === 0) return;

    void signChatImagesAction(missing).then((result) => {
      if (result.urls) {
        setImageUrls((current) => ({ ...current, ...result.urls }));
      }
    });
  }, [messages, imageUrls]);

  // Reactions for every loaded message, fetched once per message in one query.
  useEffect(() => {
    const missing = messages
      .map((message) => message.id)
      .filter((id) => !fetchedReactionIds.current.has(id));

    if (missing.length === 0) {
      return;
    }

    const requested = missing.slice(0, 100);

    for (const id of requested) {
      fetchedReactionIds.current.add(id);
    }

    void supabase
      .from("message_reactions")
      .select("message_id,user_id,reaction")
      .in("message_id", requested)
      .then(({ data, error }) => {
        if (error) {
          for (const id of requested) {
            fetchedReactionIds.current.delete(id);
          }

          return;
        }

        const rows = (data ?? []) as {
          message_id: string;
          user_id: string;
          reaction: string;
        }[];

        setReactions((current) => {
          let next = current;

          for (const row of rows) {
            if (!isReactionKey(row.reaction)) {
              continue;
            }

            next = setReactionPresence(
              next,
              row.message_id,
              row.reaction,
              row.user_id,
              true
            );
          }

          return next;
        });
      });
  }, [messages, supabase]);

  useEffect(() => {
    loadedMessageIds.current = new Set(messages.map((message) => message.id));
  }, [messages]);

  // Live reactions for messages already on screen.
  useEffect(() => {
    const channel = supabase
      .channel(`reactions-${conversationId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "message_reactions" },
        (payload) => {
          const row = payload.new as {
            message_id: string;
            user_id: string;
            reaction: string;
          };

          if (
            !isReactionKey(row.reaction) ||
            !loadedMessageIds.current.has(row.message_id)
          ) {
            return;
          }

          const reaction = row.reaction;

          setReactions((current) =>
            setReactionPresence(
              current,
              row.message_id,
              reaction,
              row.user_id,
              true
            )
          );
        }
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "message_reactions" },
        (payload) => {
          const row = payload.old as {
            message_id?: string;
            user_id?: string;
            reaction?: string;
          };

          if (
            !row.message_id ||
            !row.user_id ||
            !row.reaction ||
            !isReactionKey(row.reaction) ||
            !loadedMessageIds.current.has(row.message_id)
          ) {
            return;
          }

          setReactions((current) =>
            setReactionPresence(
              current,
              row.message_id as string,
              row.reaction as ReactionKey,
              row.user_id as string,
              false
            )
          );
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [conversationId, supabase]);

  // Tap anywhere else to close the bar or the who-reacted line.
  useEffect(() => {
    if (!reactionBarId && !whoReacted && !menuId) {
      return;
    }

    function handlePointerDown(event: PointerEvent) {
      const target = event.target as HTMLElement | null;

      if (
        target?.closest("[data-reaction-ui]") ||
        target?.closest("[data-reaction-trigger]") ||
        target?.closest("[data-message-menu]")
      ) {
        return;
      }

      setReactionBarId(null);
      setWhoReacted(null);
      setMenuId(null);
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setReactionBarId(null);
        setWhoReacted(null);
        setMenuId(null);
      }
    }

    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [reactionBarId, whoReacted, menuId]);

  useEffect(() => {
    return () => {
      if (holdTimer.current !== null) {
        window.clearTimeout(holdTimer.current);
      }

      if (copyTimer.current !== null) {
        window.clearTimeout(copyTimer.current);
      }
    };
  }, []);

  function startEdit(message: MessageRecord) {
    setMenuId(null);
    setEditingId(message.id);
    setEditDraft(message.body ?? "");
    setError(null);
  }

  async function saveEdit(messageId: string) {
    const text = editDraft.trim();
    const result = await editMessageAction(messageId, text);

    if (result.error || !result.message) {
      setError(result.error ?? "Couldn't save that edit. Try again.");
      return;
    }

    const saved = result.message;
    setMessages((current) => current.map((m) => (m.id === messageId ? saved : m)));
    setEditingId(null);
  }

  async function removeMessage(message: MessageRecord) {
    setMenuId(null);
    const result = await deleteMessageAction(message.id);

    if (result.error || !result.message) {
      setError(result.error ?? "Couldn't delete that message. Try again.");
      return;
    }

    const deleted = result.message;
    setMessages((current) => current.map((m) => (m.id === message.id ? deleted : m)));
  }

  async function togglePin(messageId: string) {
    const pinned = pinnedIds.includes(messageId);
    setMenuId(null);
    const result = await setMessagePinAction(messageId, !pinned);

    if (result.error) {
      setError(result.error);
    }
  }

  async function copyMessage(message: MessageRecord) {
    const text = message.body ?? "";

    if (!text) {
      return;
    }

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = text;
        textarea.setAttribute("readonly", "");
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.select();
        const copied = document.execCommand("copy");
        document.body.removeChild(textarea);

        if (!copied) {
          throw new Error("Copy failed");
        }
      }
    } catch {
      setError("Couldn't copy that message.");
      return;
    }

    setCopiedId(message.id);

    if (copyTimer.current !== null) {
      window.clearTimeout(copyTimer.current);
    }

    copyTimer.current = window.setTimeout(() => {
      copyTimer.current = null;
      setCopiedId(null);
      setMenuId(null);
    }, 1_500);
  }

  function clearMessageHold() {
    if (holdTimer.current !== null) {
      window.clearTimeout(holdTimer.current);
      holdTimer.current = null;
    }
  }

  // Long-press a bubble on touch to open the reaction bar and message menu.
  // Scrolling cancels it.
  function startMessageHold(
    messageId: string,
    event: React.TouchEvent<HTMLElement>
  ) {
    const touch = event.touches[0];
    holdStart.current = touch ? { x: touch.clientX, y: touch.clientY } : null;
    holdFired.current = false;
    clearMessageHold();
    holdTimer.current = window.setTimeout(() => {
      holdTimer.current = null;
      holdFired.current = true;
      setReactionBarId(messageId);
      setMenuId(messageId);
    }, 450);
  }

  function moveMessageHold(event: React.TouchEvent<HTMLElement>) {
    const touch = event.touches[0];

    if (!touch || !holdStart.current) {
      return;
    }

    if (
      Math.abs(touch.clientX - holdStart.current.x) > 10 ||
      Math.abs(touch.clientY - holdStart.current.y) > 10
    ) {
      clearMessageHold();
    }
  }

  function toggleReaction(message: MessageRecord, reaction: ReactionKey) {
    if (message.deleted_at) {
      return;
    }

    setReactionBarId(null);
    setError(null);

    const mine = (reactions[message.id]?.[reaction] ?? []).includes(
      currentUserId
    );

    // Optimistic, rolled back if the write fails.
    setReactions((current) =>
      setReactionPresence(current, message.id, reaction, currentUserId, !mine)
    );

    if (mine) {
      void supabase
        .from("message_reactions")
        .delete()
        .eq("message_id", message.id)
        .eq("user_id", currentUserId)
        .eq("reaction", reaction)
        .then(({ error: deleteError }) => {
          if (deleteError) {
            setReactions((current) =>
              setReactionPresence(current, message.id, reaction, currentUserId, true)
            );
            setError("Couldn't update that reaction. Try again.");
          }
        });
    } else {
      void supabase
        .from("message_reactions")
        .insert({ message_id: message.id, user_id: currentUserId, reaction })
        .then(({ error: insertError }) => {
          if (insertError && insertError.code !== "23505") {
            setReactions((current) =>
              setReactionPresence(current, message.id, reaction, currentUserId, false)
            );
            setError("Couldn't update that reaction. Try again.");
          }
        });
    }
  }

  const pinnedMessages = pinnedIds
    .map((id) => messages.find((message) => message.id === id))
    .filter((message): message is MessageRecord => Boolean(message));
  const latestPin = pinnedMessages[0] ?? null;

  async function jumpToMessage(messageId: string) {
    setPinsOpen(false);

    let target = document.getElementById(`msg-${messageId}`);

    if (!target) {
      const { data } = await supabase
        .from("messages")
        .select("created_at")
        .eq("id", messageId)
        .maybeSingle();

      if (!data) {
        setError("That message is gone.");
        return;
      }

      const { data: older } = await supabase
        .from("messages")
        .select(MESSAGE_SELECT)
        .eq("conversation_id", conversationId)
        .gte("created_at", (data as { created_at: string }).created_at)
        .order("created_at", { ascending: true })
        .limit(PAGE_SIZE * 4);

      const fetched = (older ?? []) as unknown as MessageRecord[];
      setMessages((current) => {
        const known = new Set(current.map((m) => m.id));
        return [...fetched.filter((m) => !known.has(m.id)), ...current].sort(
          (a, b) => a.created_at.localeCompare(b.created_at)
        );
      });
      shouldScrollToBottom.current = false;
      await new Promise((resolve) => setTimeout(resolve, 0));
      target = document.getElementById(`msg-${messageId}`);
    }

    target?.scrollIntoView({ block: "center", behavior: "smooth" });
    setHighlightId(messageId);
    window.setTimeout(() => setHighlightId(null), 1500);
  }

  async function runSearch(query: string) {
    setSearchQuery(query);
    setSearchError(null);

    if (query.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    setSearchPending(true);
    const result = await searchConversationAction(conversationId, query);
    setSearchPending(false);

    if (result.error) {
      setSearchError(result.error);
      return;
    }

    setSearchResults(result.results ?? []);
  }

  async function jumpFromSearch(messageId: string) {
    setSearchOpen(false);
    await jumpToMessage(messageId);
  }

  jumpRef.current = jumpToMessage;

  function sendTyping() {
    const now = Date.now();

    if (now - lastTypingSentRef.current < 1500 || !typingChannelRef.current) {
      return;
    }

    lastTypingSentRef.current = now;
    void typingChannelRef.current.send({
      type: "broadcast",
      event: "typing",
      payload: { user_id: currentUserId },
    });
  }

  const typingNames = Object.keys(typers).map(
    (userId) => namesById.get(userId) ?? "A friend"
  );
  const typingLabel =
    typingNames.length === 0
      ? null
      : typingNames.length === 1
      ? `${typingNames[0]} is typing…`
      : typingNames.length === 2
      ? `${typingNames[0]} and ${typingNames[1]} are typing…`
      : "Several people are typing…";

  useLayoutEffect(() => {
    const snapshot = prependSnapshot.current;

    if (snapshot) {
      prependSnapshot.current = null;
      const difference = pageScrollHeight() - snapshot.height;

      if (difference > 0) {
        setPageScrollTop(snapshot.top + difference);
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
        height: pageScrollHeight(),
        top: pageScrollTop(),
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

    const sentMentions = mentionedIds.filter((id) =>
      text.includes(`@${members.find((m) => m.id === id)?.username ?? "\u0000"}`)
    );
    const { data, error: sendError } = await supabase
      .from("messages")
      .insert({
        conversation_id: conversationId,
        user_id: currentUserId,
        body: text,
        mentions: sentMentions,
      })
      .select(MESSAGE_SELECT)
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
    setMentionedIds([]);
    setSending(false);
    void markRead();
  }

  return (
    <div ref={roomRef}>
      <div className="mb-3 flex justify-end">
        <button
          type="button"
          onClick={() => setSearchOpen((open) => !open)}
          aria-label="Search this chat"
          aria-expanded={searchOpen}
          className="inline-flex h-11 w-11 items-center justify-center rounded-lg text-text transition-colors duration-150 ease-out hover:bg-surface cursor-pointer"
        >
          {searchOpen ? <X size={20} strokeWidth={1.5} aria-hidden="true" /> : <Search size={20} strokeWidth={1.5} aria-hidden="true" />}
        </button>
      </div>

      {searchOpen && (
        <div className="mb-4 space-y-3 border-b border-line pb-4">
          <label htmlFor="chat-search" className="block text-sm text-muted">Search this chat</label>
          <input
            id="chat-search"
            type="search"
            value={searchQuery}
            onChange={(event) => void runSearch(event.target.value)}
            placeholder="Find a message"
            autoComplete="off"
            className="w-full bg-surface text-text placeholder:text-muted border border-border rounded-lg px-3 py-3 text-base focus:outline-2 focus:outline-offset-0 focus:outline-text"
          />
          {searchQuery.trim().length < 2 ? (
            <p className="text-sm text-muted">Type at least two letters.</p>
          ) : searchPending ? (
            <p className="text-sm text-muted">Searching...</p>
          ) : searchError ? (
            <p role="alert" className="text-sm text-text">{searchError}</p>
          ) : searchResults.length === 0 ? (
            <p className="text-sm text-muted">No messages match that.</p>
          ) : (
            <ul>
              {searchResults.map((result) => (
                <li key={result.id} className="border-b border-line">
                  <button
                    type="button"
                    onClick={() => void jumpFromSearch(result.id)}
                    className="flex w-full flex-col items-start gap-1 py-3 text-left cursor-pointer"
                  >
                    <span className="text-sm text-muted">
                      {namesById.get(result.user_id) ?? "A friend"} · <LocalTime iso={result.created_at} format="card" />
                    </span>
                    <span className="truncate text-base text-text">{result.body}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div ref={topRef} className="h-px" aria-hidden="true" />

      {latestPin && (
        <button
          type="button"
          onClick={() => setPinsOpen(true)}
          className="mb-3 flex w-full min-h-11 items-center justify-between gap-3 border-b border-line py-2 text-left text-sm text-text cursor-pointer"
        >
          <span className="min-w-0 truncate">
            {latestPin.body ?? "Pinned message"}
          </span>
          <span className="shrink-0 text-muted">{pinnedIds.length} pinned</span>
        </button>
      )}

      {pinsOpen && (
        <div className="mb-4 space-y-2 border-b border-line pb-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-text">Pinned</h2>
            <button
              type="button"
              onClick={() => setPinsOpen(false)}
              className="min-h-11 px-3 text-sm text-muted hover:text-text cursor-pointer"
            >
              Close
            </button>
          </div>
          <ul>
            {pinnedMessages.map((message) => (
              <li key={message.id}>
                <button
                  type="button"
                  onClick={() => void jumpToMessage(message.id)}
                  className="flex w-full min-h-11 items-center py-2 text-left text-base text-text cursor-pointer"
                >
                  <span className="min-w-0 truncate">
                    {message.body ?? "Pinned message"}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

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
            const whoUsers =
              whoReacted?.messageId === message.id
                ? reactions[message.id]?.[whoReacted.reaction] ?? []
                : [];

            return (
              <Fragment key={message.id}>
                {showTimestamp && (
                  <p className="my-3 text-center text-sm text-muted">
                    <LocalTime iso={message.created_at} format="card" />
                  </p>
                )}

                <div
                  className={`group flex flex-col ${
                    isOwn ? "items-end" : "items-start"
                  } ${index === 0 ? "" : startsRun ? "mt-3" : "mt-1"}`}
                >
                  {reactionBarId === message.id && !message.deleted_at && (
                    <div className="mb-1">
                      <ReactionBar
                        onPick={(reaction) => toggleReaction(message, reaction)}
                      />
                    </div>
                  )}

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

                  <div className="flex items-end gap-1">
                    {!message.deleted_at && (
                      <MessageMenu
                        open={menuId === message.id}
                        onToggle={() =>
                          setMenuId(menuId === message.id ? null : message.id)
                        }
                        isPinned={pinnedIds.includes(message.id)}
                        onPin={() => void togglePin(message.id)}
                        isOwn={isOwn}
                        onEdit={() => startEdit(message)}
                        onDelete={() => void removeMessage(message)}
                        hasBody={Boolean(message.body)}
                        copied={copiedId === message.id}
                        onCopy={() => void copyMessage(message)}
                      />
                    )}
                    {!message.deleted_at && (
                      <button
                        type="button"
                        data-reaction-trigger
                        onClick={() =>
                          setReactionBarId(
                            reactionBarId === message.id ? null : message.id
                          )
                        }
                        aria-label="Add a reaction"
                        aria-expanded={reactionBarId === message.id}
                        className="hidden min-h-11 min-w-11 items-center justify-center rounded-lg text-muted transition-colors duration-150 ease-out hover:text-text md:inline-flex md:invisible md:group-hover:visible md:focus-visible:visible cursor-pointer"
                      >
                        <Smile size={20} strokeWidth={1.5} aria-hidden="true" />
                      </button>
                    )}
                    <div
                      id={`msg-${message.id}`}
                      onTouchStart={(event) => startMessageHold(message.id, event)}
                      onTouchMove={moveMessageHold}
                      onTouchEnd={clearMessageHold}
                      onTouchCancel={clearMessageHold}
                      onClickCapture={(event) => {
                        // A long press opens the reaction bar instead of the photo.
                        if (holdFired.current) {
                          holdFired.current = false;
                          event.preventDefault();
                          event.stopPropagation();
                        }
                      }}
                      className={`max-w-[78%] whitespace-pre-wrap break-words rounded-lg px-3 py-2 text-base leading-relaxed transition-colors duration-150 ease-out ${
                        isOwn
                          ? "bg-text text-background"
                          : "bg-surface border border-border text-text"
                      } ${highlightId === message.id ? "ring-2 ring-accent" : ""}`}
                    >
                      {message.deleted_at ? (
                        <span className="text-sm italic text-muted">Message deleted</span>
                      ) : editingId === message.id ? (
                        <div className="space-y-2">
                          <textarea
                            value={editDraft}
                            onChange={(event) => setEditDraft(event.target.value)}
                            maxLength={2000}
                            rows={2}
                            aria-label="Edit message"
                            className="w-full min-w-[200px] bg-surface text-text border border-border rounded-lg px-2 py-2 text-base"
                          />
                          <div className="flex gap-2">
                            <button type="button" onClick={() => void saveEdit(message.id)} disabled={editDraft.trim().length === 0} className="min-h-11 rounded-lg bg-text px-3 text-sm text-background cursor-pointer disabled:opacity-60">
                              Save
                            </button>
                            <button type="button" onClick={() => setEditingId(null)} className="min-h-11 rounded-lg border border-border px-3 text-sm text-text cursor-pointer">
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          {message.image_path && (
                            imageUrls[message.image_path] ? (
                              <button type="button" onClick={() => setFullscreenUrl(imageUrls[message.image_path as string])} aria-label="Open photo" className="block cursor-pointer">
                                <img draggable={false} src={imageUrls[message.image_path]} alt={message.body ?? "Photo"} loading="lazy" className="max-h-[320px] w-auto max-w-full rounded-lg object-cover" />
                              </button>
                            ) : (
                              <span className="block h-40 w-40 animate-pulse rounded-lg bg-line" aria-label="Loading photo" />
                            )
                          )}
                          {message.body && (
                            <span className={message.image_path ? "mt-2 block" : ""}>
                              {renderBody(message.body, message.mentions, members)}
                            </span>
                          )}
                          {message.edited_at && (
                            <span className="ml-2 text-xs text-muted">edited</span>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  {!message.deleted_at &&
                    REACTION_KEYS.some(
                      (reaction) =>
                        (reactions[message.id]?.[reaction]?.length ?? 0) > 0
                    ) && (
                      <div
                        className={`mt-1 flex flex-wrap gap-1 ${
                          isOwn ? "justify-end" : "justify-start"
                        }`}
                      >
                        {REACTION_KEYS.map((reaction) => {
                          const users = reactions[message.id]?.[reaction] ?? [];

                          if (users.length === 0) {
                            return null;
                          }

                          return (
                            <ReactionChip
                              key={reaction}
                              reaction={reaction}
                              count={users.length}
                              mine={users.includes(currentUserId)}
                              onToggle={() => toggleReaction(message, reaction)}
                              onShowWho={() =>
                                setWhoReacted({
                                  messageId: message.id,
                                  reaction,
                                })
                              }
                            />
                          );
                        })}
                      </div>
                    )}

                  {whoUsers.length > 0 && (
                    <p
                      className={`mt-1 text-sm text-muted ${
                        isOwn ? "text-right" : "text-left"
                      }`}
                    >
                      {whoUsers
                        .map((userId) =>
                          userId === currentUserId
                            ? "You"
                            : namesById.get(userId) ?? "A friend"
                        )
                        .join(", ")}
                    </p>
                  )}
                </div>
              </Fragment>
            );
          })}
        </div>
      )}

      {fullscreenUrl && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Photo"
          className="fixed inset-0 z-[60] flex items-center justify-center bg-background p-4"
          onClick={() => setFullscreenUrl(null)}
        >
          <button type="button" onClick={() => setFullscreenUrl(null)} aria-label="Close photo" className="absolute right-4 top-4 min-h-11 min-w-11 rounded-lg text-text cursor-pointer">
            <X size={20} strokeWidth={1.5} aria-hidden="true" />
          </button>
          <img draggable={false} src={fullscreenUrl} alt="" className="max-h-full max-w-full object-contain" />
        </div>
      )}

      <div ref={bottomRef} className="h-36" aria-hidden="true" />

      <div
        className="fixed inset-x-0 z-30 border-t border-line bg-background"
        style={{
          bottom:
            keyboardInset > 0
              ? keyboardInset
              : "calc(56px + env(safe-area-inset-bottom, 0px))",
        }}
      >
        {mentionQuery !== null && (
          <ul aria-label="Mention someone" className="mx-auto max-w-[560px] border-b border-line bg-surface px-2">
            {members
              .filter((m) => m.id !== currentUserId)
              .filter((m) => (m.username ?? "").toLowerCase().includes(mentionQuery) || m.name.toLowerCase().includes(mentionQuery))
              .slice(0, 6)
              .map((m) => (
                <li key={m.id}>
                  <button
                    type="button"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => {
                      if (!m.username) return;
                      setBody((current) => current.replace(/@\w*$/, `@${m.username} `));
                      setMentionedIds((current) => (current.includes(m.id) ? current : [...current, m.id]));
                      setMentionQuery(null);
                    }}
                    className="flex min-h-11 w-full items-center gap-2 text-left text-sm text-text cursor-pointer"
                  >
                    <span>{m.name}</span>
                    {m.username && <span className="text-muted">@{m.username}</span>}
                  </button>
                </li>
              ))}
          </ul>
        )}
        {typingLabel && (
          <p className="mx-auto max-w-[560px] px-4 pt-2 text-sm text-muted">
            {typingLabel}
          </p>
        )}
        <form
          onSubmit={handleSend}
          className="mx-auto flex w-full max-w-[560px] items-center gap-2 px-4 py-3"
        >
          <PhotoComposer
            conversationId={conversationId}
            userId={currentUserId}
            onSent={(message) => {
              shouldScrollToBottom.current = true;
              setMessages((current) =>
                current.some((m) => m.id === message.id) ? current : [...current, message]
              );
            }}
            onError={setError}
          />
          <input
            type="text"
            value={body}
            onChange={(event) => {
              const value = event.target.value;
              setBody(value);
              sendTyping();
              const at = /@(\w*)$/.exec(value);
              setMentionQuery(isGroup && at ? at[1].toLowerCase() : null);
            }}
            placeholder="Message"
            aria-label="Message"
            enterKeyHint="send"
            autoComplete="off"
            className="min-w-0 flex-1 bg-surface text-text placeholder:text-muted border border-border rounded-lg px-3 py-3 text-base leading-snug focus:outline-2 focus:outline-offset-0 focus:outline-text"
          />

          <button
            type="submit"
            disabled={sending || body.trim().length === 0}
            className="shrink-0 min-h-11 px-4 py-3 rounded-lg bg-text text-background font-sans font-medium text-sm transition-opacity duration-150 ease-out hover:opacity-90 cursor-pointer disabled:opacity-60 disabled:pointer-events-none"
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
