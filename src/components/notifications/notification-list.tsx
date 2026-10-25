"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { markAllNotificationsReadAction } from "@/app/actions/notifications";
import { markNotificationReadAction } from "@/app/actions/notification-list";
import {
  notificationRelativeTime,
  notificationTitle,
  formatNotificationBody,
  type NotificationRecord,
} from "@/lib/notifications";

const buttonClass = "inline-flex min-h-11 items-center justify-center rounded-lg border border-border px-4 py-3 text-sm font-medium text-text transition-colors duration-150 hover:bg-surface disabled:pointer-events-none disabled:opacity-60";

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

  async function markAllRead() {
    if (pending) return;
    setPending(true);
    setError(null);
    const now = new Date().toISOString();
    setItems((current) => current.map((item) => ({ ...item, read_at: item.read_at ?? now })));
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
      setItems((current) => current.map((entry) => entry.id === item.id ? { ...entry, read_at: new Date().toISOString() } : entry));
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
    const destination = candidateUrl.startsWith("/") && !candidateUrl.startsWith("//") && !candidateUrl.includes("\\")
      ? candidateUrl
      : "/notifications";
    router.push(destination);
  }

  return <section className="space-y-3">
    {hasUnread && <div className="flex justify-end"><button type="button" disabled={pending} onClick={() => void markAllRead()} className={buttonClass}>{pending ? "Saving..." : "Mark all as read"}</button></div>}
    {error && <p role="alert" className="text-sm text-text">{error}</p>}
    {items.length === 0 ? <p className="text-sm text-muted">You’re all caught up.</p> : <ul className="border-t border-line">
      {items.map((item) => <li key={item.id} className="border-b border-line">
        <button type="button" onClick={() => void openNotification(item)} className="flex min-h-11 w-full items-start gap-3 py-4 text-left">
          <span className="mt-2 w-2 shrink-0">{!item.read_at && <span aria-label="Unread" className="block h-2 w-2 rounded-full bg-accent" />}</span>
          <span className="min-w-0 flex-1">
            <span className="block text-base font-medium text-text">{notificationTitle(item)}</span>
            {formatNotificationBody(item, timezone) && <span className="mt-1 block text-sm leading-relaxed text-muted">{formatNotificationBody(item, timezone)}</span>}
            <span className="mt-1 block text-sm text-muted">{notificationRelativeTime(item.created_at)}</span>
          </span>
        </button>
      </li>)}
    </ul>}
  </section>;
}
