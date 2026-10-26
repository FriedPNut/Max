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
import { useState } from "react";
import { markAllNotificationsReadAction } from "@/app/actions/notifications";
import { markNotificationReadAction } from "@/app/actions/notification-list";
import { Avatar, Button } from "@/components/ui";
import {
  formatNotificationBody,
  notificationRelativeTime,
  notificationTitle,
  type NotificationRecord,
} from "@/lib/notifications";

const NEW_WINDOW_MS = 24 * 60 * 60 * 1000;

const TYPE_ICONS: Record<string, LucideIcon> = {
  event_reminder: CalendarDays,
  new_event: CalendarDays,
  friend_request: UserPlus,
  friend_accepted: UserPlus,
  trip_invite: UserPlus,
  chat_message: MessageCircle,
  hang_now: PartyPopper,
  post_comment: Heart,
  birthday: Gift,
  weekly_recap: Sparkles,
  wrapped: Sparkles,
  best_of_month: Camera,
};

function avatarFromData(item: NotificationRecord) {
  const value = item.data?.avatar_url ?? item.data?.actor_avatar_url;

  return typeof value === "string" && value ? value : null;
}

function NotificationRow({
  item,
  timezone,
  onOpen,
}: {
  item: NotificationRecord;
  timezone: string;
  onOpen: () => void;
}) {
  const avatarUrl = avatarFromData(item);
  const Icon = TYPE_ICONS[item.type] ?? Bell;
  const body = formatNotificationBody(item, timezone);

  return (
    <li>
      <button
        type="button"
        onClick={onOpen}
        className="press-row flex w-full items-start gap-3 px-1 py-3.5 text-left transition-colors duration-200 ease-out hover:bg-surface-2"
      >
        <span className="relative shrink-0">
          {avatarUrl ? (
            <Avatar
              src={avatarUrl}
              name={notificationTitle(item)}
              initial="M"
              size={40}
            />
          ) : (
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-2 text-muted">
              <Icon size={20} strokeWidth={1.75} aria-hidden="true" />
            </span>
          )}

          {!item.read_at && (
            <span
              aria-label="Unread"
              className="absolute -right-1 top-0 h-2 w-2 rounded-full border-2 border-surface bg-primary"
            />
          )}
        </span>

        <span className="min-w-0 flex-1">
          <span className="block text-[14px] font-semibold leading-snug text-text">
            {notificationTitle(item)}
          </span>
          {body && (
            <span className="mt-0.5 block text-[14px] leading-snug text-muted">
              {body}
            </span>
          )}
          <span className="mt-1 block text-xs text-muted">
            {notificationRelativeTime(item.created_at)}
          </span>
        </span>
      </button>
    </li>
  );
}

function NotificationGroup({
  title,
  items,
  timezone,
  onOpen,
}: {
  title: string;
  items: NotificationRecord[];
  timezone: string;
  onOpen: (item: NotificationRecord) => void;
}) {
  if (items.length === 0) {
    return null;
  }

  return (
    <section className="space-y-1">
      <h2 className="px-1 text-lg font-semibold text-text">{title}</h2>
      <ul className="divide-y divide-line">
        {items.map((item) => (
          <NotificationRow
            key={item.id}
            item={item}
            timezone={timezone}
            onOpen={() => onOpen(item)}
          />
        ))}
      </ul>
    </section>
  );
}

export function NotificationList({
  initialNotifications,
  timezone,
}: {
  initialNotifications: NotificationRecord[];
  timezone: string;
}) {
  const [items, setItems] = useState(initialNotifications);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const router = useRouter();
  const hasUnread = items.some((item) => !item.read_at);
  const newCutoff = Date.now() - NEW_WINDOW_MS;
  const newItems = items.filter(
    (item) => new Date(item.created_at).getTime() >= newCutoff
  );
  const earlierItems = items.filter(
    (item) => new Date(item.created_at).getTime() < newCutoff
  );

  async function markAllRead() {
    if (pending) return;
    setPending(true);
    setError(null);
    const now = new Date().toISOString();
    setItems((current) =>
      current.map((item) => ({ ...item, read_at: item.read_at ?? now }))
    );
    try {
      const result = await markAllNotificationsReadAction();
      if (result.error) {
        setError(result.error);
        router.refresh();
      }
    } catch {
      setError("Couldn't mark notifications as read.");
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  async function openNotification(item: NotificationRecord) {
    if (!item.read_at) {
      setItems((current) =>
        current.map((entry) =>
          entry.id === item.id
            ? { ...entry, read_at: new Date().toISOString() }
            : entry
        )
      );
      try {
        const result = await markNotificationReadAction(item.id);
        if (result.error) {
          setError(result.error);
          router.refresh();
          return;
        }
      } catch {
        setError("Couldn't mark that notification as read.");
        router.refresh();
        return;
      }
    }
    const candidateUrl = item.url ?? "";
    const destination =
      candidateUrl.startsWith("/") &&
      !candidateUrl.startsWith("//") &&
      !candidateUrl.includes("\\")
        ? candidateUrl
        : "/notifications";
    router.push(destination);
  }

  return (
    <section className="space-y-5">
      {hasUnread && (
        <div className="flex justify-end">
          <Button
            variant="text"
            size="sm"
            disabled={pending}
            onClick={() => void markAllRead()}
          >
            {pending ? "Saving..." : "Mark all as read"}
          </Button>
        </div>
      )}
      {error && (
        <p role="alert" className="text-sm text-text">
          {error}
        </p>
      )}
      {items.length === 0 ? (
        <p className="text-sm text-muted">You’re all caught up.</p>
      ) : (
        <div className="space-y-6">
          <NotificationGroup
            title="New"
            items={newItems}
            timezone={timezone}
            onOpen={openNotification}
          />
          <NotificationGroup
            title="Earlier"
            items={earlierItems}
            timezone={timezone}
            onOpen={openNotification}
          />
        </div>
      )}
    </section>
  );
}
