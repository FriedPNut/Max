"use client";

import { useEffect } from "react";
import {
  clearEventNotifications,
  clearPostNotifications,
} from "@/lib/notification-clear";

/** Mounted on a post or event page; clears its notifications once it opens. */
export function ClearNotificationsOnOpen({
  kind,
  id,
}: {
  kind: "post" | "event";
  id: string;
}) {
  useEffect(() => {
    if (kind === "post") {
      void clearPostNotifications(id);
    } else {
      void clearEventNotifications(id);
    }
  }, [id, kind]);

  return null;
}
