"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ReactionBar } from "@/components/chat/message-reactions";
import { type ReactionKey } from "@/lib/chat";

export type PressedMessage = {
  id: string;
  body: string | null;
  /** A shared idea: Copy takes the title, and there is no body to edit. */
  isIdea?: boolean;
  isOwn: boolean;
  pinned: boolean;
  deleted: boolean;
  /** The bubble's box when the finger lifted, in viewport coordinates. */
  rect: {
    top: number;
    left: number;
    right: number;
    bottom: number;
    width: number;
  };
};

type MenuAction = {
  key: string;
  label: string;
  danger?: boolean;
  confirm?: string;
  onSelect: () => void;
};

const ROW_H = 46;
const BAR_H = 52;
const GAP = 10;
const EDGE = 8;

/**
 * The press-and-hold menu. The pressed bubble lifts out of a dimmed, blurred
 * page at its own position: reactions float above it and the action list floats
 * below, flipping above when the bottom of the screen is too close.
 *
 * Mount only while it is open; it closes on the backdrop, Escape, the back
 * gesture or any scroll.
 */
export function MessageActionMenu({
  press,
  onClose,
  onReact,
  onCopy,
  onPin,
  onEdit,
  onUnsend,
  onRemoveForMe,
}: {
  press: PressedMessage;
  onClose: () => void;
  onReact: (reaction: ReactionKey) => void;
  onCopy: () => void;
  onPin: () => void;
  onEdit?: () => void;
  onUnsend?: () => void;
  onRemoveForMe?: () => void;
}) {
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [confirming, setConfirming] = useState(false);
  const pushedRef = useRef(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // The finger that held the bubble lifts after the menu opens; that release
  // must not count as a tap on the backdrop. The timestamp is set on mount, so
  // rendering never reads the clock.
  const openedAt = useRef(0);

  useEffect(() => {
    openedAt.current = Date.now();
  }, []);
  // The parent passes a fresh callback each render; the listeners below must
  // not re-subscribe (the history entry is pushed exactly once).
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const actions: MenuAction[] = [];

  if (!press.deleted && press.body) {
    actions.push({ key: "copy", label: "Copy", onSelect: onCopy });
  }

  actions.push({
    key: "pin",
    label: press.pinned ? "Unpin" : "Pin",
    onSelect: onPin,
  });

  if (press.isOwn && !press.deleted && press.body && !press.isIdea) {
    actions.push({ key: "edit", label: "Edit", onSelect: onEdit ?? onClose });
  }

  if (press.isOwn && !press.deleted) {
    actions.push({
      key: "unsend",
      label: "Unsend",
      danger: true,
      confirm: "Unsend for everyone?",
      onSelect: () => setConfirming(true),
    });
  }

  if (!press.isOwn && !press.deleted) {
    actions.push({
      key: "hide",
      label: "Remove for me",
      danger: true,
      onSelect: onRemoveForMe ?? onClose,
    });
  }

  useEffect(() => {
    function measure() {
      setSize({ width: window.innerWidth, height: window.innerHeight });
    }

    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  // The back button closes the menu instead of leaving the chat.
  useEffect(() => {
    function onPop() {
      pushedRef.current = false;
      onCloseRef.current();
    }

    // Keep Next's own router state so the back gesture only closes the menu.
    window.history.pushState(
      { ...(window.history.state ?? {}), maxMessageMenu: true },
      ""
    );
    pushedRef.current = true;
    window.addEventListener("popstate", onPop);

    return () => {
      window.removeEventListener("popstate", onPop);

      // Only step back if our own entry is still the current one: a route
      // change unmounts the menu and must not bounce the page.
      if (pushedRef.current && window.history.state?.maxMessageMenu) {
        pushedRef.current = false;
        window.history.back();
      }
    };
  }, []);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onCloseRef.current();
      }
    }

    // Capture, because scroll does not bubble out of the message list.
    const onScroll = () => onCloseRef.current();

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("scroll", onScroll, true);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("scroll", onScroll, true);
    };
  }, []);

  useLayoutEffect(() => {
    // preventScroll: focusing the panel must not scroll the list, which would
    // instantly close the menu through the scroll listener below.
    panelRef.current?.focus({ preventScroll: true });
  }, []);

  const vh = size.height || 800;
  const vw = size.width || 360;
  const menuHeight = (confirming ? 2 : actions.length) * ROW_H + 12;
  const reactionsTop = press.rect.top - BAR_H - GAP;
  const roomBelow = vh - press.rect.bottom;
  const above = roomBelow < menuHeight + GAP + BAR_H + EDGE;
  const reactionsY = Math.max(
    EDGE,
    above ? press.rect.top - menuHeight - GAP * 2 - BAR_H : reactionsTop
  );
  const actionsY = above
    ? Math.max(EDGE, press.rect.top - menuHeight - GAP)
    : Math.min(vh - menuHeight - EDGE, press.rect.bottom + GAP);
  const barWidth = Math.min(vw - EDGE * 2, 268);
  const panelWidth = Math.min(vw - EDGE * 2, 236);
  const panelX = press.isOwn
    ? Math.max(EDGE, Math.min(vw - panelWidth - EDGE, press.rect.right - panelWidth))
    : Math.max(EDGE, Math.min(vw - panelWidth - EDGE, press.rect.left));

  return createPortal(
    <div
      className="fixed inset-0 z-[70]"
      data-message-menu
      role="presentation"
      onClick={(event) => {
        if (
          event.target === event.currentTarget &&
          Date.now() - openedAt.current > 400
        ) {
          onClose();
        }
      }}
    >
      <button
        type="button"
        aria-label="Close message options"
        onClick={() => {
          if (Date.now() - openedAt.current > 400) {
            onClose();
          }
        }}
        className="scrim-in absolute inset-0 bg-black/55 backdrop-blur-[3px]"
      />

      {/* The pressed message, lifted out of the dimmed page at its position. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute"
        style={{
          top: press.rect.top,
          left: press.rect.left,
          width: press.rect.width,
        }}
      >
        <div
          className={`bubble-lift max-h-40 overflow-hidden rounded-[22px] px-3.5 py-2 text-base leading-[1.4] ${
            press.isOwn ? "bubble-mine" : "bg-surface-2 text-text"
          }`}
        >
          {press.body ??
            (press.deleted ? "Message deleted" : "Photo")}
        </div>
      </div>

      <div
        className="menu-in absolute"
        style={{ top: reactionsY, left: (vw - barWidth) / 2, width: barWidth }}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex justify-center">
          <ReactionBar onPick={onReact} />
        </div>
      </div>

      <div
        ref={panelRef}
        tabIndex={-1}
        role="menu"
        aria-label="Message options"
        className="menu-in absolute overflow-hidden rounded-card bg-surface shadow-pop outline-none"
        style={{
          top: actionsY,
          left: panelX,
          width: panelWidth,
          animationDelay: "20ms",
        }}
        onClick={(event) => event.stopPropagation()}
      >
        {confirming ? (
          <>
            <p className="px-4 pt-3 text-[13px] text-muted">
              {actions.find((action) => action.key === "unsend")?.confirm}
              <span className="mt-0.5 block text-text">
                Everyone loses this message.
              </span>
            </p>
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                onUnsend?.();
                onClose();
              }}
              className="mt-1 block min-h-11 w-full px-4 text-left text-[15px] font-semibold text-danger"
              style={{ height: ROW_H }}
            >
              Unsend
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={() => setConfirming(false)}
              className="block min-h-11 w-full px-4 text-left text-[15px] text-text"
              style={{ height: ROW_H }}
            >
              Keep
            </button>
          </>
        ) : (
          actions.map((action) => (
            <button
              key={action.key}
              type="button"
              role="menuitem"
              aria-label={action.label}
              onClick={() => {
                if (action.confirm) {
                  action.onSelect();
                  return;
                }

                action.onSelect();
                onClose();
              }}
              className={`block min-h-11 w-full px-4 text-left text-[15px] transition-colors duration-100 ease-out hover:bg-surface-2 ${
                action.danger ? "text-danger" : "text-text"
              }`}
              style={{ height: ROW_H }}
            >
              {action.label}
            </button>
          ))
        )}
      </div>
    </div>,
    document.body
  );
}
