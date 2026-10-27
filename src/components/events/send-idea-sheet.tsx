"use client";

import { Search, X } from "lucide-react";
import { useEffect, useState } from "react";
import {
  loadIdeaShareTargetsAction,
  sendIdeaToChatsAction,
  type IdeaShareTarget,
} from "@/app/actions/ideas";
import { Avatar, Button, Input, Sheet, Textarea } from "@/components/ui";
import { IDEA_SHARE_NOTE_LIMIT } from "@/lib/ideas";

/**
 * Send an idea to one or more chats. Chats come first, then friends without a
 * chat yet (picking one starts the DM). A note is optional and becomes the
 * message body, so unread previews and search can show it.
 */
export function SendIdeaSheet({
  ideaId,
  ideaTitle,
  onClose,
  onSent,
}: {
  ideaId: string;
  ideaTitle: string;
  onClose: () => void;
  onSent: (message: string) => void;
}) {
  const [conversations, setConversations] = useState<IdeaShareTarget[]>([]);
  const [friends, setFriends] = useState<IdeaShareTarget[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    let active = true;

    void loadIdeaShareTargetsAction().then((result) => {
      if (!active) {
        return;
      }

      setLoading(false);

      if (result.error) {
        setLoadError(result.error);
        return;
      }

      setConversations(result.conversations ?? []);
      setFriends(result.friends ?? []);
    });

    return () => {
      active = false;
    };
  }, []);

  function toggle(key: string) {
    setSelected((current) =>
      current.includes(key)
        ? current.filter((value) => value !== key)
        : [...current, key]
    );
    setError(null);
  }

  async function send() {
    if (pending) {
      return;
    }

    if (selected.length === 0) {
      setError("Pick at least one chat.");
      return;
    }

    const chosen = [...conversations, ...friends].filter((target) =>
      selected.includes(target.key)
    );
    const conversationIds = chosen
      .map((target) => target.conversationId)
      .filter((id): id is string => Boolean(id));
    const friendIds = chosen
      .map((target) => target.friendId)
      .filter((id): id is string => Boolean(id));

    setPending(true);
    setError(null);

    try {
      const result = await sendIdeaToChatsAction({
        ideaId,
        conversationIds,
        friendIds,
        note,
      });

      if (result.error) {
        setError(result.error);
        return;
      }

      onSent(result.message ?? "Sent to your chats");
      onClose();
    } catch {
      setError("Couldn't share that idea. Try again.");
    } finally {
      setPending(false);
    }
  }

  const term = query.trim().toLowerCase();

  function matches(target: IdeaShareTarget) {
    return !term || target.name.toLowerCase().includes(term);
  }

  const visibleConversations = conversations.filter(matches);
  const visibleFriends = friends.filter(matches);
  const nothingMatches =
    !loading &&
    visibleConversations.length === 0 &&
    visibleFriends.length === 0;

  function targetRow(target: IdeaShareTarget) {
    const checked = selected.includes(target.key);

    return (
      <label
        key={target.key}
        className="flex min-h-14 cursor-pointer items-center gap-3 border-b border-line px-4 py-2.5 last:border-b-0"
      >
        <Avatar src={null} initial={target.initial} name={target.name} size={40} />

        <span className="min-w-0 flex-1">
          <span className="block truncate text-[15px] font-semibold text-text">
            {target.name}
          </span>
          {target.isGroup && (
            <span className="mt-0.5 block text-[13px] text-muted">Group</span>
          )}
          {!target.conversationId && (
            <span className="mt-0.5 block text-[13px] text-muted">
              Starts a chat
            </span>
          )}
        </span>

        <input
          type="checkbox"
          checked={checked}
          onChange={() => toggle(target.key)}
          className="h-5 w-5 shrink-0 accent-primary"
        />
      </label>
    );
  }

  return (
    <Sheet label="Send to chat" onClose={onClose} tall>
      <div className="mb-4 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 id="send-idea-title" className="text-lg font-semibold text-text">
            Send to chat
          </h2>
          <p className="mt-0.5 truncate text-[13px] text-muted">{ideaTitle}</p>
        </div>

        <Button
          variant="secondary"
          size="sm"
          onClick={onClose}
          disabled={pending}
          aria-label="Close"
          className="h-11 w-11 shrink-0 px-0"
        >
          <X size={24} strokeWidth={1.75} aria-hidden="true" />
        </Button>
      </div>

      <div className="space-y-4">
        <div className="relative">
          <Search
            size={20}
            strokeWidth={1.75}
            aria-hidden="true"
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted"
          />
          <Input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            autoComplete="off"
            placeholder="Search chats and friends"
            aria-label="Search chats and friends"
            pill
            className="bg-surface-2"
            style={{ paddingLeft: "2.75rem" }}
          />
        </div>

        {loading ? (
          <p className="text-[13px] text-muted">Loading your chats...</p>
        ) : loadError ? (
          <p role="alert" className="text-[13px] text-danger">
            {loadError}
          </p>
        ) : nothingMatches ? (
          <p className="text-[13px] text-muted">
            {term ? "No chats or friends match that." : "No chats or friends yet."}
          </p>
        ) : (
          <div className="space-y-5">
            {visibleConversations.length > 0 && (
              <div>
                <h3 className="mb-1 text-[13px] font-semibold text-muted">
                  Chats
                </h3>
                <div className="border-t border-line">
                  {visibleConversations.map(targetRow)}
                </div>
              </div>
            )}

            {visibleFriends.length > 0 && (
              <div>
                <h3 className="mb-1 text-[13px] font-semibold text-muted">
                  Friends
                </h3>
                <div className="border-t border-line">
                  {visibleFriends.map(targetRow)}
                </div>
              </div>
            )}
          </div>
        )}

        <div>
          <label htmlFor="idea-share-note" className="mb-2 block text-[13px] text-muted">
            Note (optional)
          </label>
          <Textarea
            id="idea-share-note"
            value={note}
            onChange={(event) => setNote(event.target.value)}
            rows={2}
            maxLength={IDEA_SHARE_NOTE_LIMIT}
            disabled={pending}
            placeholder="This one sounds fun."
            className="resize-y"
          />
        </div>

        {error && (
          <p role="alert" className="text-[13px] text-danger">
            {error}
          </p>
        )}

        <Button
          onClick={() => void send()}
          disabled={pending || selected.length === 0}
          className="w-full"
        >
          {pending
            ? "Sending..."
            : selected.length > 1
            ? `Send to ${selected.length} chats`
            : "Send"}
        </Button>
      </div>
    </Sheet>
  );
}
