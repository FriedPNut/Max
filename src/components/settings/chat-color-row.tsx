"use client";

import { useState } from "react";
import { MessageSquare } from "lucide-react";
import { Sheet } from "@/components/ui";
import { ChatColorPicker } from "@/components/chat/chat-color-picker";
import { useChatColor } from "@/lib/use-chat-color";

/**
 * The "Chat color" row on /settings. The color applies the moment it is picked
 * — the CSS variable is written first, then the profile is saved — so nothing
 * waits on the network and no bubble re-renders.
 */
export function ChatColorRow({ initialColor }: { initialColor: string | null }) {
  const [open, setOpen] = useState(false);
  const { color, choose, error, reset } = useChatColor(initialColor);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="press-row flex min-h-11 w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors duration-200 ease-out hover:bg-surface-2"
      >
        <span className="flex min-w-0 items-center gap-3">
          <MessageSquare
            size={24}
            strokeWidth={1.75}
            aria-hidden="true"
            className="shrink-0 text-text"
          />
          <span className="text-[15px] text-text">Chat color</span>
        </span>
        <span
          aria-hidden="true"
          className="h-6 w-6 shrink-0 rounded-full ring-1 ring-line"
          style={{ backgroundColor: color }}
        />
      </button>

      {open ? (
        <Sheet label="Chat color" onClose={() => setOpen(false)}>
          <div className="space-y-4 pb-2">
            <div>
              <h2 className="text-[20px] font-bold text-text">Chat color</h2>
              <p className="mt-1 text-[13px] text-muted">
                Your messages use this color everywhere.
              </p>
            </div>

            <ChatColorPicker
              value={color}
              onChange={choose}
              onReset={reset}
            />

            {error ? (
              <p role="alert" className="text-[13px] text-danger">
                {error}
              </p>
            ) : null}
          </div>
        </Sheet>
      ) : null}
    </>
  );
}
