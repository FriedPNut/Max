"use client";

import {
  Bell,
  CalendarDays,
  Camera,
  Gift,
  Heart,
  MessageCircle,
  PartyPopper,
  Sparkles,
  UserPlus,
  type LucideIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Avatar, Button } from "@/components/ui";
import {
  announceNotificationsChanged,
  clearAllNotifications,
  clearChatMessageNotifications,
  deleteNotificationIds,
} from "@/lib/notification-clear";
import {
  chatNotificationCountLabel,
  chatNotificationPreview,
  chatNotificationTitle,
  notificationActorAvatar,
  notificationActorId,
  notificationActorName,
  notificationRelativeTime,
  notificationSectionFor,
  notificationSections,
  notificationSentence,
  notificationTimeLabel,
  withNotificationActorProfiles,
  type NotificationActorProfile,
  type NotificationDisplayRow,
  type NotificationRecord,
  type NotificationSectionId,
} from "@/lib/notifications";
import { notificationDestination } from "@/lib/routes";
import { createClient } from "@/lib/supabase/client";
import { useNow } from "@/lib/use-now";

const NOTIFICATION_COLUMNS =
  "id,user_id,type,title,body,url,data,created_at,read_at";

const TYPE_ICONS: Record<string, LucideIcon> = {
  event_reminder: CalendarDays,
  new_event: CalendarDays,
  friend_request: UserPlus,
  friend_accepted: UserPlus,
  buddy_request: UserPlus,
  buddy_nudge: Bell,
  trip_invite: UserPlus,
  chat_message: MessageCircle,
  hang_now: PartyPopper,
  new_post: Camera,
  post_comment: Heart,
  birthday: Gift,
  weekly_recap: Sparkles,
  wrapped: Sparkles,
  best_of_month: Camera,
};

const SECTION_ICONS: Record<NotificationSectionId, LucideIcon> = {
  chat: MessageCircle,
  friends: UserPlus,
  posts: Camera,
  events: CalendarDays,
  other: Bell,
};

function RowAvatar({
  item,
  fallbackName,
}: {
  item: NotificationRecord;
  fallbackName: string;
}) {
  const avatarUrl = notificationActorAvatar(item);
  const Icon =
    TYPE_ICONS[item.type] ?? SECTION_ICONS[notificationSectionFor(item.type)];

  if (avatarUrl) {
    return (
      <Avatar
        src={avatarUrl}
        name={fallbackName}
        initial={fallbackName.charAt(0)}
        size={40}
      />
    );
  }

  return (
    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-2 text-muted">
      <Icon size={20} strokeWidth={1.75} aria-hidden="true" />
    </span>
  );
}

function NotificationRowView({
  row,
  onOpen,
}: {
  row: NotificationDisplayRow<NotificationRecord>;
  onOpen: () => void;
}) {
  // A browser-only clock: the time label is absolute until this exists.
  const now = useNow();
  const item = row.latest;
  const isChat = row.kind === "chat";
  const sentence = notificationSentence(item);
  const title = chatNotificationTitle(item);
  const preview = chatNotificationPreview(item);
  const name = notificationActorName(item) ?? title;

  return (
    <li className="cv-auto">
      <button
        type="button"
        onClick={onOpen}
        className="press-row flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors duration-200 ease-out hover:bg-surface-2"
      >
        <span className="relative shrink-0">
          <RowAvatar item={item} fallbackName={name} />

          {!item.read_at && (
            <span
              aria-label="Unread"
              className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-background bg-primary"
            />
          )}
        </span>

        <span className="min-w-0 flex-1">
          {isChat ? (
            <>
              <span className="flex items-baseline justify-between gap-2">
                <span className="truncate text-[14px] font-semibold leading-snug text-text">
                  {title}
                </span>
                <span className="shrink-0 text-xs text-muted">
                  {notificationTimeLabel(item.created_at, now)}
                </span>
              </span>
              {preview && (
                <span className="mt-0.5 block truncate text-[14px] leading-snug text-muted">
                  {preview}
                </span>
              )}
              <span className="mt-0.5 block text-xs text-muted">
                {chatNotificationCountLabel(row.count)}
              </span>
            </>
          ) : (
            <span className="flex items-baseline justify-between gap-2">
              <span className="min-w-0 flex-1 text-[14px] leading-snug text-text">
                {sentence.name ? (
                  <>
                    <span className="font-semibold">{sentence.name}</span>
                    {sentence.after}
                  </>
                ) : (
                  sentence.before
                )}
              </span>
              <span className="shrink-0 text-xs text-muted">
                {notificationTimeLabel(item.created_at, now)}
              </span>
            </span>
          )}
        </span>
      </button>
    </li>
  );
}

function NotificationGroup({
  title,
  count,
  rows,
  onOpen,
}: {
  title: string;
  count: number;
  rows: NotificationDisplayRow<NotificationRecord>[];
  onOpen: (row: NotificationDisplayRow<NotificationRecord>) => void;
}) {
  if (rows.length === 0) return null;

  return (
    <section className="space-y-2">
      <h2 className="flex items-baseline gap-2 px-4 text-base font-semibold text-text">
        {title}
        <span className="text-[13px] font-normal text-muted">{count}</span>
      </h2>
      <ul>
        {rows.map((row) => (
          <NotificationRowView
            key={row.key}
            row={row}
            onOpen={() => onOpen(row)}
          />
        ))}
      </ul>
    </section>
  );
}

export function NotificationList({
  initialNotifications,
  userId,
}: {
  initialNotifications: NotificationRecord[];
  userId: string;
}) {
  const [items, setItems] = useState(initialNotifications);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const sections = notificationSections(items);

  const refresh = useCallback(async () => {
    const { data, error: loadError } = await supabase
      .from("notifications")
      .select(NOTIFICATION_COLUMNS)
      .eq("user_id", userId)
      .is("read_at", null)
      .order("created_at", { ascending: false })
      .limit(100);

    if (loadError) return;

    const rows = (data ?? []) as NotificationRecord[];
    const actorIds = [
      ...new Set(
        rows
          .map((row) => notificationActorId(row))
          .filter((id): id is string => Boolean(id))
      ),
    ];

    if (actorIds.length === 0) {
      setItems(rows);
      return;
    }

    const { data: profileData } = await supabase
      .from("profiles")
      .select("id,display_name,username,avatar_url")
      .in("id", actorIds);

    setItems(
      withNotificationActorProfiles(
        rows,
        (profileData ?? []) as NotificationActorProfile[]
      )
    );
  }, [supabase, userId]);

  // New rows arrive without a reload; clears elsewhere are picked up when the
  // page is opened again.
  useEffect(() => {
    const channel = supabase
      .channel(`notifications-center-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        () => {
          void refresh();
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [refresh, supabase, userId]);

  async function clearAll() {
    if (pending) return;

    const previous = items;
    setPending(true);
    setError(null);
    setItems([]);
    announceNotificationsChanged();

    const result = await clearAllNotifications();
    setPending(false);

    if (result.error) {
      setError(result.error);
      setItems(previous);
    }
  }

  function openRow(row: NotificationDisplayRow<NotificationRecord>) {
    setItems((current) =>
      current.filter((item) => !row.ids.includes(item.id))
    );
    announceNotificationsChanged();

    if (row.kind === "chat" && row.conversationId) {
      void clearChatMessageNotifications(row.conversationId);
    } else {
      void deleteNotificationIds(row.ids);
    }

    router.push(notificationDestination(row.latest));
  }

  return (
    <section className="space-y-5">
      {items.length > 0 && (
        <div className="flex justify-end">
          <Button variant="text" size="sm" onClick={() => void clearAll()}>
            {pending ? "Clearing..." : "Clear all"}
          </Button>
        </div>
      )}

      {error && (
        <p role="alert" className="text-sm text-text">
          {error}
        </p>
      )}

      {items.length === 0 ? (
        <p className="py-10 text-center text-[15px] text-muted">
          You’re all caught up.
        </p>
      ) : (
        <div className="-mx-4 space-y-5">
          {sections.map((section) => (
            <NotificationGroup
              key={section.id}
              title={section.label}
              count={section.rows.length}
              rows={section.rows}
              onOpen={openRow}
            />
          ))}
        </div>
      )}
    </section>
  );
}
