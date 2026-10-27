"use client";

import { createContext, useContext, useEffect, useState } from "react";
import type { RealtimeChannel, SupabaseClient } from "@supabase/supabase-js";

const PresenceContext = createContext<Set<string>>(new Set());

export function usePresence() {
  return useContext(PresenceContext);
}

export function PresenceProvider({
  userId,
  children,
}: {
  userId: string;
  children: React.ReactNode;
}) {
  const [online, setOnline] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    let cancelled = false;
    let channel: RealtimeChannel | null = null;
    let supabase: SupabaseClient | null = null;

    void (async () => {
      const { createClient } = await import("@/lib/supabase/client");
      supabase = createClient();

      if (cancelled) return;

      const active = supabase.channel("app-presence", {
        config: { presence: { key: userId } },
      });
      channel = active;

      active
        .on("presence", { event: "sync" }, () => {
          const state = active.presenceState();
          setOnline(new Set(Object.keys(state)));
        })
        .subscribe(async (status) => {
          if (status === "SUBSCRIBED") {
            await active.track({ online_at: new Date().toISOString() });
          }
        });
    })();

    return () => {
      cancelled = true;
      if (supabase && channel) {
        void supabase.removeChannel(channel);
      }
    };
  }, [userId]);

  return (
    <PresenceContext.Provider value={online}>
      {children}
    </PresenceContext.Provider>
  );
}

export function OnlineDot({ userId }: { userId: string | null | undefined }) {
  const online = usePresence();

  if (!userId || !online.has(userId)) {
    return null;
  }

  return (
    <span
      aria-label="Active now"
      title="Active now"
      className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-background bg-primary"
    />
  );
}
