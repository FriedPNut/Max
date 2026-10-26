"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

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
  const supabase = useMemo(() => createClient(), []);
  const [online, setOnline] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    const channel = supabase.channel("app-presence", {
      config: { presence: { key: userId } },
    });

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        setOnline(new Set(Object.keys(state)));
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({ online_at: new Date().toISOString() });
        }
      });

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [supabase, userId]);

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
