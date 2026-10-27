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
  type ReactNode,
} from "react";
import { ArrowLeft, Info, X } from "lucide-react";
import { Avatar, Button, Input, Sheet, Textarea } from "@/components/ui";
import { LocalTime } from "@/components/local-time";
import { PhotoComposer } from "@/components/chat/photo-composer";
import { IdeaCardInChat } from "@/components/events/idea-card";
import { DmActiveStatus } from "@/components/chat/dm-active-status";
import { ReactionChip } from "@/components/chat/message-reactions";
import {
  MessageActionMenu,
  type PressedMessage,
} from "@/components/chat/message-actions";
import { useKeyboardInset } from "@/lib/use-keyboard-inset";
import { useNow } from "@/lib/use-now";
import { applyBubbleColor } from "@/lib/bubble-colors";
import { clearChatMessageNotifications } from "@/lib/notification-clear";
import { loadIdeaCardsAction } from "@/app/actions/ideas";
import {
  applyIdeaPatch,
  applyIdeaRemoval,
  ideaIdsFromMessages,
  type IdeaCard,
} from "@/lib/ideas";
import { useIdeaSync, type IdeaSyncDetail } from "@/lib/idea-sync";
import {
  RECEIPT_AVATAR_LIMIT,
  hasSeen,
  readReceiptPayload,
  receiptWriteDelay,
  receiptsByMessage,
  seenLabel,
  type ReceiptMember,
} from "@/lib/read-receipts";
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
  hideMessageForMeAction,
  setMessagePinAction,
  signChatImagesAction,
} from "@/app/actions/chat-messages";

const PAGE_SIZE = 30;
const TIMESTAMP_GAP_MS = 30 * 60 * 1000;
// Long histories stay in state but only the newest slice is mounted.
const MESSAGE_WINDOW = 120;
/** How long a finger must rest on a bubble before the menu opens. */
const HOLD_MS = 350;
const HOLD_TOLERANCE = 10;

function mergeMessages(
  current: MessageRecord[],
  incoming: MessageRecord[]
): MessageRecord[] {
  if (incoming.length === 0) {
    return current;
  }

  const positions = new Map(
    current.map((message, index) => [message.id, index] as const)
  );
  let next = current;

  for (const message of incoming) {
    const at = positions.get(message.id);

    if (at === undefined) {
      if (next === current) {
        next = current.slice();
        positions.set(message.id, next.length);
        next.push(message);
      } else {
        positions.set(message.id, next.length);
        next = [...next, message];
      }

      continue;
    }

    // Same id: the server copy replaces the optimistic one in place.
    next = next.slice();
    next[at] = { ...next[at], ...message };
  }

  return next;
}

function omitKey(
  record: Record<string, true>,
  key: string
): Record<string, true> {
  const next = { ...record };
  delete next[key];
  return next;
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

  const pattern = new RegExp(
    `(@(?:${usernames.map((u) => u.replace(/[^\w]/g, "")).join("|")})\\b)`,
    "g"
  );

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
  title,
  otherUserId,
  infoHref,
  avatarUrl,
  avatarInitial,
  bubbleColor,
  nicknames,
  initialHiddenIds,
  clearedAt,
  receiptsOn,
  receiptMembers,
  initialIdeaCards,
}: {
  conversationId: string;
  currentUserId: string;
  isGroup: boolean;
  members: ChatMember[];
  initialMessages: MessageRecord[];
  initialHasMore: boolean;
  targetMessageId?: string | null;
  title: string;
  /** The other person in a DM; null for group chats. */
  otherUserId?: string | null;
  infoHref: string;
  avatarUrl: string | null;
  avatarInitial: string;
  bubbleColor?: string | null;
  /** Shared nicknames for this chat, by user id. */
  nicknames?: Record<string, string>;
  initialHiddenIds: string[];
  /** Cleared history: nothing older than this may load again. */
  clearedAt?: string | null;
  /** My read_receipts setting; off means I record nothing and see nothing. */
  receiptsOn: boolean;
  /** Everyone else's seen_at and receipt preference. */
  receiptMembers: ReceiptMember[];
  /** Cards for the ideas already shared in this conversation. */
  initialIdeaCards: IdeaCard[];
}) {
  const supabase = useMemo(() => createClient(), []);
  const hiddenRef = useRef<Set<string>>(
    new Set(initialHiddenIds.filter(Boolean))
  );
  const [messages, setMessages] = useState<MessageRecord[]>(() =>
    initialMessages.filter((message) => !hiddenRef.current.has(message.id))
  );
  // null means the idea was deleted; a missing key means it is still loading.
  const [ideaCards, setIdeaCards] = useState<Record<string, IdeaCard | null>>(
    () => Object.fromEntries(initialIdeaCards.map((card) => [card.id, card]))
  );
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [olderError, setOlderError] = useState<string | null>(null);
  const [body, setBody] = useState("");
  // Messages that are on screen but not saved yet, and the ones that failed.
  const [pendingIds, setPendingIds] = useState<Record<string, true>>({});
  const [failedIds, setFailedIds] = useState<Record<string, true>>({});
  // Only this many messages stay in the DOM; the rest live in state only.
  const [windowStart, setWindowStart] = useState(() =>
    Math.max(
      0,
      initialMessages.filter((message) => !hiddenRef.current.has(message.id))
        .length - MESSAGE_WINDOW
    )
  );
  const [error, setError] = useState<string | null>(null);
  const [typers, setTypers] = useState<Record<string, number>>({});
  const [pinnedIds, setPinnedIds] = useState<string[]>([]);
  const [pinsOpen, setPinsOpen] = useState(false);
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [press, setPress] = useState<PressedMessage | null>(null);
  const [imageUrls, setImageUrls] = useState<Record<string, string>>({});
  const [failedPhotoPaths, setFailedPhotoPaths] = useState<string[]>([]);
  const [fullscreenUrl, setFullscreenUrl] = useState<string | null>(null);
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionedIds, setMentionedIds] = useState<string[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState("");
  const [reactions, setReactions] = useState<ReactionMap>({});
  const [whoReacted, setWhoReacted] = useState<{
    messageId: string;
    reaction: ReactionKey;
  } | null>(null);
  const [seenBy, setSeenBy] = useState<Record<string, string | null>>(() =>
    Object.fromEntries(
      receiptMembers.map((member) => [member.id, member.seenAt])
    )
  );

  const typingChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(
    null
  );
  const openedTargetRef = useRef(false);
  const lastTypingSentRef = useRef(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const topRef = useRef<HTMLDivElement>(null);
  const loadingOlderRef = useRef(false);
  const shouldScrollToBottom = useRef(true);
  const prependSnapshot = useRef<{ height: number; top: number } | null>(null);
  const fetchedReactionIds = useRef(new Set<string>());
  const loadedMessageIds = useRef(new Set<string>());
  // Sends leave the device in order, one at a time.
  const outbox = useRef<Array<() => Promise<void>>>([]);
  const draining = useRef(false);
  const retries = useRef(new Map<string, () => Promise<void>>());
  const messagesRef = useRef(messages);
  const pinnedRef = useRef(pinnedIds);
  const keyboardInset = useKeyboardInset();

  messagesRef.current = messages;
  pinnedRef.current = pinnedIds;

  // The profile is the source of truth; localStorage only makes the first
  // paint right. Reading it here never re-renders a bubble.
  useEffect(() => {
    if (bubbleColor) {
      applyBubbleColor(bubbleColor);
    }
  }, [bubbleColor]);

  function scroller() {
    return scrollRef.current;
  }

  function nearBottom() {
    const element = scroller();
    return element
      ? element.scrollHeight - element.clientHeight - element.scrollTop < 160
      : true;
  }

  function pinToBottom(smooth = false) {
    const element = scroller();

    if (element) {
      element.scrollTo({ top: element.scrollHeight, behavior: smooth ? "smooth" : "auto" });
    }
  }

  const namesById = useMemo(() => {
    return new Map(
      members.map((member) => [
        member.id,
        nicknames?.[member.id] ?? member.name,
      ])
    );
  }, [members, nicknames]);
  const usernamesById = useMemo(() => {
    return new Map(
      members.map((member) => [member.id, member.username] as const)
    );
  }, [members]);

  const lastReadWrite = useRef(0);
  const readTimer = useRef<number | null>(null);
  const readPending = useRef(false);

  const writeRead = useCallback(() => {
    readPending.current = false;

    // Hidden tabs never write, even if the timer fires.
    if (document.visibilityState !== "visible") {
      return;
    }

    const now = new Date();
    lastReadWrite.current = now.getTime();
    void supabase
      .from("conversation_members")
      .update(readReceiptPayload(receiptsOn, now))
      .eq("conversation_id", conversationId)
      .eq("user_id", currentUserId);
  }, [conversationId, currentUserId, receiptsOn, supabase]);

  /** last_read_at always, seen_at only with receipts on, at most every 2s. */
  const markRead = useCallback(() => {
    if (document.visibilityState !== "visible") {
      return;
    }

    const delay = receiptWriteDelay(lastReadWrite.current, Date.now());

    if (delay === 0) {
      if (readTimer.current !== null) {
        window.clearTimeout(readTimer.current);
        readTimer.current = null;
      }

      writeRead();
      return;
    }

    readPending.current = true;

    if (readTimer.current === null) {
      readTimer.current = window.setTimeout(() => {
        readTimer.current = null;

        if (readPending.current) {
          writeRead();
        }
      }, delay);
    }
  }, [writeRead]);

  useEffect(() => {
    markRead();

    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        markRead();
      }
    };

    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      document.removeEventListener("visibilitychange", onVisibility);

      if (readTimer.current !== null) {
        window.clearTimeout(readTimer.current);
        readTimer.current = null;
      }
    };
  }, [markRead]);

  // Reading a conversation clears its chat notifications. A notification that
  // lands while the conversation is on screen is deleted as soon as it exists.
  useEffect(() => {
    const clear = () => {
      if (document.visibilityState === "visible") {
        void clearChatMessageNotifications(conversationId);
      }
    };

    clear();

    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        clear();
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    const channel = supabase
      .channel(`chat-notifications-${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${currentUserId}`,
        },
        (payload) => {
          const row = payload.new as {
            type?: string;
            data?: { conversation_id?: unknown } | null;
          };

          if (
            row.type === "chat_message" &&
            row.data?.conversation_id === conversationId &&
            document.visibilityState === "visible"
          ) {
            void clearChatMessageNotifications(conversationId);
          }
        }
      )
      .subscribe();

    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      void supabase.removeChannel(channel);
    };
  }, [conversationId, currentUserId, supabase]);

  const latestShownRef = useRef<string | null>(null);
  latestShownRef.current = messages[messages.length - 1]?.created_at ?? null;

  // Pulls anything newer than the last shown message, so a missed Realtime
  // event (before subscribe or while the tab was hidden) can't leave us stale.
  const refetchNewer = useCallback(async () => {
    const since = latestShownRef.current;
    let query = supabase
      .from("messages")
      .select(MESSAGE_SELECT)
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true })
      .limit(100);

    if (since) {
      query = query.gt("created_at", since);
    }

    const { data, error: fetchError } = await query;

    if (fetchError) {
      return;
    }

    const newer = ((data ?? []) as unknown as MessageRecord[]).filter(
      (message) => !hiddenRef.current.has(message.id)
    );

    if (newer.length > 0) {
      setMessages((current) => mergeMessages(current, newer));
      shouldScrollToBottom.current = true;
      void markRead();
    }
  }, [conversationId, markRead, supabase]);


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

          // Hidden for me: never shown, even when it arrives live.
          if (hiddenRef.current.has(message.id)) {
            return;
          }

          if (nearBottom()) {
            shouldScrollToBottom.current = true;
          }

          setMessages((current) => mergeMessages(current, [message]));

          // The echo confirms the optimistic row we already show.
          setPendingIds((current) =>
            current[message.id] ? omitKey(current, message.id) : current
          );
          setFailedIds((current) =>
            current[message.id] ? omitKey(current, message.id) : current
          );

          void markRead();
        }
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          void refetchNewer();
        }
      });

    const onFocus = () => {
      if (document.visibilityState === "visible") {
        void refetchNewer();
      }
    };
    document.addEventListener("visibilitychange", onFocus);

    return () => {
      document.removeEventListener("visibilitychange", onFocus);
      void supabase.removeChannel(channel);
    };
  }, [conversationId, markRead, refetchNewer, supabase]);

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
      .filter(
        (p): p is string =>
          Boolean(p) &&
          !imageUrls[p as string] &&
          !failedPhotoPaths.includes(p as string)
      );

    if (missing.length === 0) return;

    void signChatImagesAction(missing).then((result) => {
      if (result.urls) {
        setImageUrls((current) => ({ ...current, ...result.urls }));
      }
      const failed = missing.filter((p) => !result.urls?.[p]);
      if (failed.length > 0) {
        setFailedPhotoPaths((current) => [
          ...current,
          ...failed.filter((p) => !current.includes(p)),
        ]);
      }
    });
  }, [messages, imageUrls, failedPhotoPaths]);

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
      .then(({ data, error: reactionError }) => {
        if (reactionError) {
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

  // Tap anywhere else to close the who-reacted line.
  useEffect(() => {
    if (!whoReacted) {
      return;
    }

    function handlePointerDown(event: PointerEvent) {
      const target = event.target as HTMLElement | null;

      if (target?.closest("[data-reaction-ui]")) {
        return;
      }

      setWhoReacted(null);
    }

    window.addEventListener("pointerdown", handlePointerDown);

    return () => window.removeEventListener("pointerdown", handlePointerDown);
  }, [whoReacted]);

  function startEdit(message: MessageRecord) {
    setPress(null);
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
    setMessages((current) =>
      current.map((m) => (m.id === messageId ? { ...m, ...saved } : m))
    );
    setEditingId(null);
  }

  async function removeMessage(message: MessageRecord) {
    setPress(null);
    const result = await deleteMessageAction(message.id);

    if (result.error || !result.message) {
      setError(result.error ?? "Couldn't delete that message. Try again.");
      return;
    }

    const deleted = result.message;
    setMessages((current) =>
      current.map((m) => (m.id === message.id ? { ...m, ...deleted } : m))
    );
  }

  async function hideForMe(message: MessageRecord) {
    setPress(null);
    const snapshot = messagesRef.current;
    hiddenRef.current.add(message.id);
    setMessages((current) => current.filter((m) => m.id !== message.id));

    const result = await hideMessageForMeAction(message.id);

    if (result.error) {
      hiddenRef.current.delete(message.id);
      setMessages(snapshot);
      setError(result.error);
    }
  }

  async function togglePin(messageId: string) {
    const pinned = pinnedRef.current.includes(messageId);
    setPress(null);
    const result = await setMessagePinAction(messageId, !pinned);

    if (result.error) {
      setError(result.error);
    }
  }

  async function copyMessage(message: MessageRecord) {
    const text = message.idea_id
      ? ideaCardsRef.current[message.idea_id]?.title ?? ""
      : message.body ?? "";

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
    }
  }

  function toggleReaction(message: MessageRecord, reaction: ReactionKey) {
    if (message.deleted_at) {
      return;
    }

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

      const fetched = ((older ?? []) as unknown as MessageRecord[]).filter(
        (message) => !hiddenRef.current.has(message.id)
      );
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
    const element = scroller();
    const snapshot = prependSnapshot.current;

    if (snapshot) {
      prependSnapshot.current = null;
      const difference = (element?.scrollHeight ?? snapshot.height) - snapshot.height;

      if (element && difference !== 0) {
        element.scrollTop = snapshot.top + difference;
      }

      return;
    }

    if (shouldScrollToBottom.current) {
      shouldScrollToBottom.current = false;
      pinToBottom();
    }
  }, [messages, windowStart]);

  // Keeps the mounted window bounded while new messages arrive, but only
  // trims when the newest messages are the ones in view.
  useEffect(() => {
    if (messages.length - windowStart <= MESSAGE_WINDOW) {
      return;
    }

    if (nearBottom()) {
      setWindowStart(messages.length - MESSAGE_WINDOW);
    }
  }, [messages, windowStart]);

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

    let olderRequest = supabase
      .from("messages")
      .select(MESSAGE_SELECT)
      .eq("conversation_id", conversationId)
      .lt("created_at", oldest.created_at);

    // A cleared chat never pages back into history I cleared.
    if (clearedAt) {
      olderRequest = olderRequest.gt("created_at", clearedAt);
    }

    const { data, error: olderLoadError } = await olderRequest
      .order("created_at", { ascending: false })
      .limit(PAGE_SIZE);

    if (olderLoadError) {
      loadingOlderRef.current = false;
      setLoadingOlder(false);
      setOlderError("Couldn't load older messages.");
      return;
    }

    const older = ((data ?? []) as unknown as MessageRecord[])
      .filter((message) => !hiddenRef.current.has(message.id))
      .slice()
      .reverse();

    const element = scroller();

    if (older.length > 0) {
      prependSnapshot.current = {
        height: element?.scrollHeight ?? 0,
        top: element?.scrollTop ?? 0,
      };

      setMessages((current) => {
        const existingIds = new Set(current.map((message) => message.id));
        const freshOlder = older.filter(
          (message) => !existingIds.has(message.id)
        );

        return [...freshOlder, ...current];
      });
    }

    setHasMore((data ?? []).length === PAGE_SIZE);
    loadingOlderRef.current = false;
    setLoadingOlder(false);
  }, [clearedAt, conversationId, hasMore, messages, supabase]);

  const showMoreHistory = useCallback(() => {
    if (windowStart > 0) {
      const element = scroller();
      prependSnapshot.current = {
        height: element?.scrollHeight ?? 0,
        top: element?.scrollTop ?? 0,
      };
      setWindowStart((current) => Math.max(0, current - MESSAGE_WINDOW / 2));
      return;
    }

    void loadOlder();
  }, [loadOlder, windowStart]);

  useEffect(() => {
    if (!hasMore && windowStart === 0) {
      return;
    }

    const node = topRef.current;
    const root = scroller();

    if (!node || !root) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          showMoreHistory();
        }
      },
      { root, rootMargin: "240px 0px 0px 0px" }
    );

    observer.observe(node);

    return () => observer.disconnect();
  }, [hasMore, showMoreHistory, windowStart]);

  // Sends drain one at a time so the order on screen is the order saved.
  const drainOutbox = useCallback(async () => {
    if (draining.current) {
      return;
    }

    draining.current = true;

    try {
      while (outbox.current.length > 0) {
        const job = outbox.current[0];

        try {
          await job();
        } finally {
          // A retry re-queues itself; drop the finished head only once.
          if (outbox.current[0] === job) {
            outbox.current.shift();
          }
        }
      }
    } finally {
      draining.current = false;
    }
  }, []);

  const enqueue = useCallback(
    (job: () => Promise<void>) => {
      outbox.current.push(job);
      void drainOutbox();
    },
    [drainOutbox]
  );

  const confirmMessage = useCallback((saved: MessageRecord) => {
    setMessages((current) => mergeMessages(current, [saved]));
    setPendingIds((current) =>
      current[saved.id] ? omitKey(current, saved.id) : current
    );
    setFailedIds((current) =>
      current[saved.id] ? omitKey(current, saved.id) : current
    );
    retries.current.delete(saved.id);
  }, []);

  const failMessage = useCallback((id: string, retry: () => Promise<void>) => {
    retries.current.set(id, retry);
    setPendingIds((current) => (current[id] ? omitKey(current, id) : current));
    setFailedIds((current) => ({ ...current, [id]: true }));
  }, []);

  // One insert for one client-generated id, so the bubble that is already on
  // screen is the row the server stores and Realtime echoes back.
  const sendTextMessage = useCallback(
    async (id: string, text: string, mentions: string[]) => {
      setFailedIds((current) => (current[id] ? omitKey(current, id) : current));
      setPendingIds((current) => ({ ...current, [id]: true }));

      const retry = () => sendTextMessage(id, text, mentions);

      try {
        const { data, error: sendError } = await supabase
          .from("messages")
          .insert({
            id,
            conversation_id: conversationId,
            user_id: currentUserId,
            body: text,
            mentions,
          })
          .select(MESSAGE_SELECT)
          .single();

        if (sendError || !data) {
          failMessage(id, retry);
          return;
        }

        confirmMessage(data as unknown as MessageRecord);
        void markRead();
      } catch {
        failMessage(id, retry);
      }
    },
    [confirmMessage, conversationId, currentUserId, failMessage, markRead, supabase]
  );

  function handleSend(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = body.trim();

    if (!text) {
      return;
    }

    const sentMentions = mentionedIds.filter((id) =>
      text.includes(`@${members.find((m) => m.id === id)?.username ?? "\u0000"}`)
    );
    const id = crypto.randomUUID();
    const optimistic: MessageRecord = {
      id,
      conversation_id: conversationId,
      user_id: currentUserId,
      body: text,
      created_at: new Date().toISOString(),
      image_path: null,
      edited_at: null,
      deleted_at: null,
      mentions: sentMentions,
    };

    // The bubble, the cleared input, and the scroll all happen on this frame.
    setBody("");
    setMentionedIds([]);
    setMentionQuery(null);
    setError(null);
    shouldScrollToBottom.current = true;
    setMessages((current) => [...current, optimistic]);
    setPendingIds((current) => ({ ...current, [id]: true }));

    enqueue(() => sendTextMessage(id, text, sentMentions));
  }

  function retryMessage(id: string) {
    const retry = retries.current.get(id);

    if (!retry) {
      return;
    }

    setFailedIds((current) => omitKey(current, id));
    setPendingIds((current) => ({ ...current, [id]: true }));
    enqueue(retry);
  }

  function addPendingPhoto(
    message: MessageRecord,
    previewUrl: string,
    retry: () => Promise<void>
  ) {
    retries.current.set(message.id, retry);
    shouldScrollToBottom.current = true;
    setMessages((current) => [...current, message]);
    setPendingIds((current) => ({ ...current, [message.id]: true }));

    if (message.image_path) {
      setImageUrls((current) => ({
        ...current,
        [message.image_path as string]: previewUrl,
      }));
    }
  }

  // ---------------------------------------------------------------- hold menu

  const openPress = useCallback(
    (messageId: string, rect: DOMRect) => {
      const message = messagesRef.current.find(
        (candidate) => candidate.id === messageId
      );

      if (!message) {
        return;
      }

      if (navigator.vibrate && /Android/i.test(navigator.userAgent)) {
        navigator.vibrate(8);
      }

      // An idea message copies its title, so the menu behaves like any other.
      const ideaTitle = message.idea_id
        ? ideaCardsRef.current[message.idea_id]?.title ?? null
        : null;

      setPress({
        id: message.id,
        body: message.deleted_at ? null : ideaTitle ?? message.body,
        isIdea: Boolean(message.idea_id),
        isOwn: message.user_id === currentUserId,
        pinned: pinnedRef.current.includes(message.id),
        deleted: Boolean(message.deleted_at),
        rect: {
          top: rect.top,
          left: rect.left,
          right: rect.right,
          bottom: rect.bottom,
          width: rect.width,
        },
      });
    },
    [currentUserId]
  );

  const openPressRef = useRef(openPress);
  openPressRef.current = openPress;

  // One passive listener set for the whole list: rows never attach handlers, so
  // scrolling stays untouched. 350ms of stillness opens the menu; moving more
  // than 10px cancels it.
  useEffect(() => {
    const element = scrollRef.current;

    if (!element) {
      return;
    }

    let origin: { x: number; y: number } | null = null;
    let timer: number | null = null;

    function clear() {
      if (timer !== null) {
        window.clearTimeout(timer);
        timer = null;
      }

      origin = null;
    }

    function start(target: Element, x: number, y: number) {
      clear();
      origin = { x, y };
      timer = window.setTimeout(() => {
        timer = null;
        origin = null;
        const bubble =
          target.querySelector<HTMLElement>(".message-bubble") ?? target;
        openPressRef.current(
          (target as HTMLElement).dataset.messageId as string,
          bubble.getBoundingClientRect()
        );
      }, HOLD_MS);
    }

    function moved(x: number, y: number) {
      if (!origin) {
        return false;
      }

      return (
        Math.abs(x - origin.x) > HOLD_TOLERANCE ||
        Math.abs(y - origin.y) > HOLD_TOLERANCE
      );
    }

    function onTouchStart(event: TouchEvent) {
      if (event.touches.length !== 1) {
        clear();
        return;
      }

      const touch = event.touches[0];
      const target = (event.target as Element | null)?.closest(
        "[data-message-id]"
      );

      if (!touch || !target) {
        clear();
        return;
      }

      start(target, touch.clientX, touch.clientY);
    }

    function onTouchMove(event: TouchEvent) {
      const touch = event.touches[0];

      if (touch && moved(touch.clientX, touch.clientY)) {
        clear();
      }
    }

    function onPointerDown(event: PointerEvent) {
      if (event.pointerType !== "mouse" || event.button !== 0) {
        return;
      }

      const target = (event.target as Element | null)?.closest(
        "[data-message-id]"
      );

      if (!target) {
        return;
      }

      start(target, event.clientX, event.clientY);
    }

    function onPointerMove(event: PointerEvent) {
      if (event.pointerType === "mouse" && moved(event.clientX, event.clientY)) {
        clear();
      }
    }

    function onContextMenu(event: MouseEvent) {
      const target = (event.target as Element | null)?.closest(
        "[data-message-id]"
      );

      if (!target) {
        return;
      }

      event.preventDefault();
      clear();
      const bubble =
        target.querySelector<HTMLElement>(".message-bubble") ?? target;
      openPressRef.current(
        (target as HTMLElement).dataset.messageId as string,
        bubble.getBoundingClientRect()
      );
    }

    element.addEventListener("touchstart", onTouchStart, { passive: true });
    element.addEventListener("touchmove", onTouchMove, { passive: true });
    element.addEventListener("touchend", clear, { passive: true });
    element.addEventListener("touchcancel", clear, { passive: true });
    element.addEventListener("pointerdown", onPointerDown);
    element.addEventListener("pointermove", onPointerMove);
    element.addEventListener("pointerup", clear);
    element.addEventListener("pointercancel", clear);
    element.addEventListener("contextmenu", onContextMenu);

    return () => {
      clear();
      element.removeEventListener("touchstart", onTouchStart);
      element.removeEventListener("touchmove", onTouchMove);
      element.removeEventListener("touchend", clear);
      element.removeEventListener("touchcancel", clear);
      element.removeEventListener("pointerdown", onPointerDown);
      element.removeEventListener("pointermove", onPointerMove);
      element.removeEventListener("pointerup", clear);
      element.removeEventListener("pointercancel", clear);
      element.removeEventListener("contextmenu", onContextMenu);
    };
  }, []);

  // Live receipts: the member rows are already subscribed above, so markers
  // move in place instead of the whole thread refetching.
  useEffect(() => {
    const channel = supabase
      .channel(`receipts-${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "conversation_members",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const row = payload.new as {
            user_id?: string;
            seen_at?: string | null;
          };

          if (!row.user_id || row.user_id === currentUserId) {
            return;
          }

          const userId = row.user_id;
          const seenAt = row.seen_at ?? null;

          setSeenBy((current) =>
            current[userId] === seenAt
              ? current
              : { ...current, [userId]: seenAt }
          );
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [conversationId, currentUserId, supabase]);

  const ideaCardsRef = useRef(ideaCards);
  ideaCardsRef.current = ideaCards;
  const ideaMessageIds = useMemo(
    () => ideaIdsFromMessages(messages),
    [messages]
  );
  const ideaIdKey = ideaMessageIds.join(",");

  // Cards the server did not seed (an older page, or a share that just landed)
  // load once and stay in state.
  useEffect(() => {
    const missing = ideaIdKey
      .split(",")
      .filter((id) => id && !(id in ideaCardsRef.current));

    if (missing.length === 0) {
      return;
    }

    let active = true;

    void loadIdeaCardsAction(missing).then((result) => {
      if (!active || !result.cards || result.cards.length + (result.missingIds?.length ?? 0) === 0) {
        return;
      }

      setIdeaCards((current) => {
        const next = { ...current };

        for (const card of result.cards ?? []) {
          next[card.id] = card;
        }

        for (const id of result.missingIds ?? []) {
          next[id] = null;
        }

        return next;
      });
    });

    return () => {
      active = false;
    };
  }, [ideaIdKey]);

  const applyIdeaSync = useCallback((detail: IdeaSyncDetail) => {
    setIdeaCards((current) =>
      detail.kind === "remove"
        ? applyIdeaRemoval(current, detail.ideaId)
        : applyIdeaPatch(current, detail.idea)
    );
  }, []);
  useIdeaSync(currentUserId, applyIdeaSync);

  const refreshIdeaCards = useCallback(() => {
    const ids = Object.keys(ideaCardsRef.current).filter(
      (id) => ideaCardsRef.current[id] !== null
    );

    if (ids.length === 0) {
      return;
    }

    void loadIdeaCardsAction(ids).then((result) => {
      if (!result.cards && !result.missingIds?.length) {
        return;
      }

      setIdeaCards((current) => {
        const next = { ...current };

        for (const card of result.cards ?? []) {
          next[card.id] = card;
        }

        for (const id of result.missingIds ?? []) {
          next[id] = null;
        }

        return next;
      });
    });
  }, []);

  // Live votes and conversions from other people. Realtime is the fast path;
  // coming back to the tab re-checks the same cards, so nothing stays stale if
  // the idea tables are not broadcast.
  useEffect(() => {
    let timer: number | null = null;

    function schedule() {
      if (timer !== null) {
        window.clearTimeout(timer);
      }

      timer = window.setTimeout(() => {
        timer = null;
        refreshIdeaCards();
      }, 400);
    }

    const channel = supabase
      .channel(`idea-cards-${conversationId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "event_ideas" },
        schedule
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "idea_votes" },
        schedule
      )
      .subscribe();

    function onVisible() {
      if (document.visibilityState === "visible") {
        schedule();
      }
    }

    window.addEventListener("focus", schedule);
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      if (timer !== null) {
        window.clearTimeout(timer);
      }

      window.removeEventListener("focus", schedule);
      document.removeEventListener("visibilitychange", onVisible);
      void supabase.removeChannel(channel);
    };
  }, [conversationId, refreshIdeaCards, supabase]);

  const memberInfoById = useMemo(
    () => new Map(members.map((member) => [member.id, member])),
    [members]
  );
  const liveReceiptMembers = useMemo<ReceiptMember[]>(
    () =>
      receiptMembers.map((member) => ({
        ...member,
        seenAt: seenBy[member.id] ?? null,
      })),
    [receiptMembers, seenBy]
  );
  const receiptsByMessageId = useMemo(() => {
    if (!isGroup || !receiptsOn) {
      return new Map<string, ReceiptMember[]>();
    }

    return receiptsByMessage(messages, liveReceiptMembers);
  }, [isGroup, messages, receiptsOn, liveReceiptMembers]);
  // Someone with receipts off never shows up, even if they left a seen_at
  // behind before turning them off.
  const otherReceiptMember = !isGroup
    ? liveReceiptMembers.find((member) => member.id !== currentUserId) ?? null
    : null;
  const otherSeenAt =
    otherReceiptMember && otherReceiptMember.receiptsOn
      ? otherReceiptMember.seenAt
      : null;
  const clock = useNow(60_000);

  const visible = windowStart > 0 ? messages.slice(windowStart) : messages;
  const pressedMessage = press
    ? messages.find((message) => message.id === press.id) ?? null
    : null;

  return (
    <div
      data-chat-screen
      className="fixed inset-0 flex h-[100dvh] flex-col overflow-hidden bg-thread text-text"
      style={{ paddingBottom: keyboardInset }}
    >
      <header className="flex-none border-b border-line">
        <div
          className="flex items-center gap-1 px-2 pb-1.5"
          style={{ paddingTop: "max(6px, env(safe-area-inset-top, 0px))" }}
        >
          <Link
            href="/chat"
            aria-label="Back to messages"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-text transition-colors duration-200 ease-out active:bg-surface-2"
          >
            <ArrowLeft size={24} strokeWidth={1.75} aria-hidden="true" />
          </Link>

          <Avatar src={avatarUrl} initial={avatarInitial} size={32} />

          <div className="min-w-0 flex-1 px-1.5">
            <h1 className="truncate text-[15px] font-semibold leading-tight text-text">
              {title}
            </h1>
            {typingLabel ? (
              <p className="mt-0.5 truncate text-xs text-muted">{typingLabel}</p>
            ) : isGroup ? (
              <p className="mt-0.5 truncate text-xs text-muted">
                {members.length} {members.length === 1 ? "member" : "members"}
              </p>
            ) : (
              <DmActiveStatus userId={otherUserId ?? null} />
            )}
          </div>

          <Link
            href={infoHref}
            aria-label="Chat details"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-text transition-colors duration-200 ease-out active:bg-surface-2"
          >
            <Info size={24} strokeWidth={1.75} aria-hidden="true" />
          </Link>
        </div>

        {latestPin ? (
          <button
            type="button"
            onClick={() => setPinsOpen(true)}
            className="flex min-h-11 w-full items-center justify-between gap-3 border-t border-line px-3 py-2 text-left text-[13px]"
          >
            <span className="min-w-0 truncate text-text">
              {latestPin.body ?? "Pinned message"}
            </span>
            <span className="shrink-0 text-muted">
              {pinnedIds.length} pinned
            </span>
          </button>
        ) : null}
      </header>

      {/*
       * The only scroll container in the screen. Its height comes from flex,
       * never from the message count, so the composer below cannot move.
       */}
      <div
        ref={scrollRef}
        data-chat-scroll
        className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain"
      >
        <div className="flex min-h-full flex-col px-3 pb-3">
          <div className="mt-auto" aria-hidden="true" />

          <div ref={topRef} className="h-px" aria-hidden="true" />

          {loadingOlder ? (
            <p className="py-2 text-center text-[13px] text-muted">
              Loading older messages…
            </p>
          ) : null}

          {olderError ? (
            <p role="alert" className="py-2 text-center text-[13px] text-text">
              {olderError}
            </p>
          ) : null}

          {messages.length === 0 ? (
            <p className="py-6 text-center text-[13px] text-muted">
              No messages yet. Say hi.
            </p>
          ) : (
            visible.map((message, offset) => {
              const index = windowStart + offset;
              const previous = messages[index - 1];
              const next = messages[index + 1];
              const isOwn = message.user_id === currentUserId;
              const startsRun =
                !previous || previous.user_id !== message.user_id;
              const endsRun =
                !next ||
                next.user_id !== message.user_id ||
                new Date(next.created_at).getTime() -
                  new Date(message.created_at).getTime() >
                  TIMESTAMP_GAP_MS;
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
              const hasReactions =
                !message.deleted_at &&
                REACTION_KEYS.some(
                  (reaction) =>
                    (reactions[message.id]?.[reaction]?.length ?? 0) > 0
                );
              const imageUrl = message.image_path
                ? imageUrls[message.image_path] ?? null
                : null;
              const photoFailed = message.image_path
                ? failedPhotoPaths.includes(message.image_path)
                : false;
              const mineBubble = isOwn
                ? "bubble-mine"
                : "bg-surface-2 text-text";
              const corner = endsRun
                ? isOwn
                  ? "rounded-br-[6px]"
                  : "rounded-bl-[6px]"
                : "";
              // Group receipts sit under the message each person's seen_at
              // falls on; my own avatar never appears.
              const seenList =
                isGroup && receiptsOn && !message.deleted_at
                  ? receiptsByMessageId.get(message.id) ?? []
                  : [];
              const lastOwnInDm =
                !isGroup &&
                isOwn &&
                !message.deleted_at &&
                // "Sent" would be a lie while it is on its way or has failed.
                !pendingIds[message.id] &&
                !failedIds[message.id] &&
                index === messages.length - 1;
              const dmSeen =
                lastOwnInDm &&
                receiptsOn &&
                hasSeen(otherSeenAt, message.created_at);

              return (
                <Fragment key={message.id}>
                  {showTimestamp ? (
                    <p className="my-3 text-center text-[12px] text-muted">
                      <LocalTime iso={message.created_at} format="card" />
                    </p>
                  ) : null}

                  <div
                    className={`flex flex-col ${
                      isOwn ? "items-end" : "items-start"
                    } ${startsRun ? "mt-3" : "mt-0.5"}`}
                  >
                    {isGroup && startsRun && !isOwn ? (
                      username ? (
                        <Link
                          href={`/u/${username}`}
                          className="mb-1 px-1 text-[12px] font-semibold text-muted"
                        >
                          {name}
                        </Link>
                      ) : (
                        <p className="mb-1 px-1 text-[12px] font-semibold text-muted">
                          {name}
                        </p>
                      )
                    ) : null}

                    {editingId === message.id ? (
                      <div className="w-full max-w-[78%] rounded-[18px] border border-line bg-surface p-2">
                        <Textarea
                          value={editDraft}
                          onChange={(event) => setEditDraft(event.target.value)}
                          maxLength={2000}
                          rows={2}
                          aria-label="Edit message"
                          className="px-2 py-2"
                        />
                        <div className="mt-2 flex justify-end gap-2">
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => setEditingId(null)}
                          >
                            Cancel
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => void saveEdit(message.id)}
                            disabled={editDraft.trim().length === 0}
                          >
                            Save
                          </Button>
                        </div>
                      </div>
                    ) : message.idea_id && !message.deleted_at ? (
                      <div
                        data-message-id={message.id}
                        className="flex w-[78%] max-w-[78%] flex-col"
                      >
                        {message.body ? (
                          <p className="mb-1 whitespace-pre-wrap break-words px-1 text-[13px] text-muted">
                            {message.body}
                          </p>
                        ) : null}

                        <IdeaCardInChat
                          ideaId={message.idea_id}
                          card={ideaCards[message.idea_id]}
                          userId={currentUserId}
                          onRemoved={() =>
                            setIdeaCards((current) =>
                              applyIdeaRemoval(current, message.idea_id as string)
                            )
                          }
                        />
                      </div>
                    ) : (
                      <div
                        data-message-id={message.id}
                        className="flex max-w-[78%] flex-col"
                      >
                        {message.deleted_at ? (
                          <div
                            id={`msg-${message.id}`}
                            className="message-bubble rounded-[18px] border border-line bg-surface-2 px-3.5 py-2 text-[15px] italic text-muted"
                          >
                            Message deleted
                          </div>
                        ) : (
                          <>
                            {message.image_path ? (
                              <div
                                id={`msg-${message.id}`}
                                className={`message-bubble overflow-hidden rounded-[18px] ${
                                  highlightId === message.id
                                    ? "ring-2 ring-primary"
                                    : ""
                                }`}
                              >
                                {imageUrl ? (
                                  <button
                                    type="button"
                                    onClick={() => setFullscreenUrl(imageUrl)}
                                    aria-label="Open photo"
                                    className="block"
                                  >
                                    <img
                                      draggable={false}
                                      src={imageUrl}
                                      alt={message.body ?? "Photo"}
                                      loading="lazy"
                                      decoding="async"
                                      className="block h-auto max-h-[380px] w-auto max-w-full rounded-[18px]"
                                    />
                                  </button>
                                ) : photoFailed ? (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setFailedPhotoPaths((current) =>
                                        current.filter(
                                          (path) => path !== message.image_path
                                        )
                                      )
                                    }
                                    className="flex aspect-[3/4] w-44 items-center justify-center rounded-[18px] bg-surface-2 p-3 text-center text-[13px] text-muted"
                                  >
                                    Couldn&apos;t load photo. Tap to retry.
                                  </button>
                                ) : (
                                  <span
                                    aria-label="Loading photo"
                                    className="skeleton block aspect-[3/4] w-44 rounded-[18px]"
                                  />
                                )}
                              </div>
                            ) : null}

                            {message.body ? (
                              <div
                                id={message.image_path ? undefined : `msg-${message.id}`}
                                className={`message-bubble whitespace-pre-wrap break-words rounded-[22px] px-3.5 py-2 text-base leading-[1.4] ${
                                  message.image_path ? `mt-1 ${mineBubble}` : mineBubble
                                } ${corner} ${
                                  highlightId === message.id
                                    ? "ring-2 ring-primary"
                                    : ""
                                }`}
                              >
                                {renderBody(message.body, message.mentions, members)}
                                {message.edited_at ? (
                                  <span className="ml-1.5 text-[11px] opacity-70">
                                    edited
                                  </span>
                                ) : null}
                              </div>
                            ) : null}
                          </>
                        )}

                        {pendingIds[message.id] && !message.deleted_at ? (
                          <span className="mt-0.5 px-1 text-[11px] text-muted">
                            Sending…
                          </span>
                        ) : null}

                        {failedIds[message.id] && !message.deleted_at ? (
                          <button
                            type="button"
                            onClick={() => retryMessage(message.id)}
                            className="mt-0.5 px-1 text-[11px] text-muted underline"
                          >
                            Not sent · Tap to retry
                          </button>
                        ) : null}
                      </div>
                    )}

                    {hasReactions ? (
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
                    ) : null}

                    {whoUsers.length > 0 ? (
                      <p
                        className={`mt-1 px-1 text-[12px] text-muted ${
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
                    ) : null}

                    {seenList.length > 0 ? (
                      <div className="mt-1 flex w-full items-center justify-end gap-1">
                        <span className="flex items-center">
                          {seenList
                            .slice(0, RECEIPT_AVATAR_LIMIT)
                            .map((member, position) => {
                              const info = memberInfoById.get(member.id);

                              return (
                                <span
                                  key={member.id}
                                  title={info?.name ?? undefined}
                                  className={`block h-3.5 w-3.5 overflow-hidden rounded-full bg-surface-2 ring-1 ring-background ${
                                    position > 0 ? "-ml-1" : ""
                                  }`}
                                >
                                  {info?.avatarUrl ? (
                                    <img
                                      src={info.avatarUrl}
                                      alt=""
                                      loading="lazy"
                                      className="h-full w-full object-cover"
                                    />
                                  ) : (
                                    <span className="flex h-full w-full items-center justify-center text-[7px] font-semibold text-text">
                                      {info?.initial ?? "?"}
                                    </span>
                                  )}
                                </span>
                              );
                            })}
                        </span>
                        {seenList.length > RECEIPT_AVATAR_LIMIT ? (
                          <span className="text-[11px] text-muted">
                            +{seenList.length - RECEIPT_AVATAR_LIMIT}
                          </span>
                        ) : null}
                      </div>
                    ) : null}

                    {lastOwnInDm ? (
                      <p className="mt-1 px-1 text-[12px] text-muted">
                        {dmSeen
                          ? clock === null
                            ? "Seen"
                            : seenLabel(otherSeenAt, clock)
                          : "Sent"}
                      </p>
                    ) : null}
                  </div>
                </Fragment>
              );
            })
          )}
        </div>
      </div>

      <div className="flex-none border-t border-line bg-thread">
        {mentionQuery !== null ? (
          <ul
            aria-label="Mention someone"
            className="border-b border-line bg-surface px-2"
          >
            {members
              .filter((member) => member.id !== currentUserId)
              .filter(
                (member) =>
                  (member.username ?? "")
                    .toLowerCase()
                    .includes(mentionQuery) ||
                  member.name.toLowerCase().includes(mentionQuery)
              )
              .slice(0, 6)
              .map((member) => (
                <li key={member.id}>
                  <button
                    type="button"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => {
                      if (!member.username) return;
                      setBody((current) =>
                        current.replace(/@\w*$/, `@${member.username} `)
                      );
                      setMentionedIds((current) =>
                        current.includes(member.id)
                          ? current
                          : [...current, member.id]
                      );
                      setMentionQuery(null);
                    }}
                    className="flex min-h-11 w-full items-center gap-2 text-left text-[15px] text-text"
                  >
                    <span>{namesById.get(member.id) ?? member.name}</span>
                    {member.username ? (
                      <span className="text-muted">@{member.username}</span>
                    ) : null}
                  </button>
                </li>
              ))}
          </ul>
        ) : null}

        <form
          onSubmit={handleSend}
          className="flex items-center gap-2 px-3 pt-2"
          style={{
            paddingBottom:
              keyboardInset > 0
                ? "8px"
                : "max(8px, env(safe-area-inset-bottom, 0px))",
          }}
        >
          <div className={body.trim().length > 0 ? "hidden" : "contents"}>
            <PhotoComposer
              conversationId={conversationId}
              userId={currentUserId}
              onOptimistic={addPendingPhoto}
              onSent={confirmMessage}
              onFailed={(id) => {
                setPendingIds((current) => omitKey(current, id));
                setFailedIds((current) => ({ ...current, [id]: true }));
              }}
              onError={setError}
            />
          </div>

          <Input
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
            pill
            className="min-w-0 flex-1 px-4 py-2.5"
          />

          {body.trim().length > 0 ? (
            <Button
              type="submit"
              variant="text"
              size="sm"
              className="shrink-0 text-primary"
            >
              Send
            </Button>
          ) : null}
        </form>

        {error ? (
          <p role="alert" className="px-4 pb-2 text-[13px] text-text">
            {error}
          </p>
        ) : null}
      </div>

      {pinsOpen ? (
        <Sheet label="Pinned messages" onClose={() => setPinsOpen(false)}>
          <div className="space-y-2 pb-2">
            <h2 className="text-[20px] font-bold text-text">Pinned</h2>
            {pinnedMessages.length === 0 ? (
              <p className="text-[13px] text-muted">Nothing pinned here yet.</p>
            ) : (
              <ul>
                {pinnedMessages.map((message) => (
                  <li key={message.id} className="border-b border-line last:border-0">
                    <button
                      type="button"
                      onClick={() => void jumpToMessage(message.id)}
                      className="flex min-h-11 w-full items-center py-2 text-left text-[15px] text-text"
                    >
                      <span className="min-w-0 truncate">
                        {message.body ?? "Pinned message"}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Sheet>
      ) : null}

      {fullscreenUrl ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Photo"
          className="fixed inset-0 z-[80] flex items-center justify-center bg-background p-4"
          onClick={() => setFullscreenUrl(null)}
        >
          <button
            type="button"
            onClick={() => setFullscreenUrl(null)}
            aria-label="Close photo"
            className="absolute right-4 top-4 flex h-11 w-11 items-center justify-center rounded-full text-text"
          >
            <X size={24} strokeWidth={1.75} aria-hidden="true" />
          </button>
          <img
            draggable={false}
            src={fullscreenUrl}
            alt=""
            className="max-h-full max-w-full object-contain"
          />
        </div>
      ) : null}

      {press && pressedMessage ? (
        <MessageActionMenu
          press={press}
          onClose={() => setPress(null)}
          onReact={(reaction) => {
            toggleReaction(pressedMessage, reaction);
            setPress(null);
          }}
          onCopy={() => {
            void copyMessage(pressedMessage);
            setPress(null);
          }}
          onPin={() => void togglePin(pressedMessage.id)}
          onEdit={() => startEdit(pressedMessage)}
          onUnsend={() => void removeMessage(pressedMessage)}
          onRemoveForMe={() => void hideForMe(pressedMessage)}
        />
      ) : null}
    </div>
  );
}
