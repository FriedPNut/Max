"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

const PushPrompt = dynamic(
  () => import("@/components/notifications/push-prompt").then((m) => m.PushPrompt),
  { ssr: false }
);

/** Push registration never competes with first paint. */
export function LazyPushPrompt({ userId }: { userId: string }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const show = () => setReady(true);
    const idle = window.requestIdleCallback;

    if (idle) {
      const id = idle(show, { timeout: 1200 });
      return () => window.cancelIdleCallback?.(id);
    }

    const timer = window.setTimeout(show, 250);
    return () => window.clearTimeout(timer);
  }, []);

  if (!ready) return null;

  return <PushPrompt userId={userId} />;
}
