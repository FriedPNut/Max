"use client";

import { useState, useTransition } from "react";
import {
  addFriendAction,
  removeFriendAction,
  type ChatActionState,
} from "@/app/actions/chat";
import { Button, Sheet, Toast } from "@/components/ui";

/**
 * Add (primary) when we aren't friends, Added (secondary) when we are.
 * Adding updates the button at once and rolls back with a plain error if the
 * server call fails. Tapping Added opens a sheet to remove the friendship.
 */
export function FriendToggle({
  friendId,
  name,
  initialFriend,
  size = "sm",
  fullWidth = false,
  onChange,
}: {
  friendId: string;
  name: string;
  initialFriend: boolean;
  size?: "sm" | "md";
  fullWidth?: boolean;
  onChange?: (isFriend: boolean) => void;
}) {
  const [isFriend, setIsFriend] = useState(initialFriend);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();

  function setFriend(next: boolean) {
    setIsFriend(next);
    onChange?.(next);
  }

  function handleAdd() {
    if (pending) return;
    setError(null);
    setFriend(true);

    startTransition(async () => {
      const formData = new FormData();
      formData.set("friend_id", friendId);

      try {
        const result = await addFriendAction({} as ChatActionState, formData);

        if (result.error) {
          setFriend(false);
          setError(result.error);
          return;
        }

        setToast(`Added ${name}`);
      } catch {
        setFriend(false);
        setError("Couldn't add that person. Try again.");
      }
    });
  }

  function closeSheet() {
    setSheetOpen(false);
    setConfirming(false);
  }

  function handleRemove() {
    if (pending) return;
    setError(null);
    closeSheet();
    setFriend(false);

    startTransition(async () => {
      const formData = new FormData();
      formData.set("friend_id", friendId);

      try {
        const result = await removeFriendAction({} as ChatActionState, formData);

        if (result.error) {
          setFriend(true);
          setError(result.error);
        }
      } catch {
        setFriend(true);
        setError("Couldn't remove that person. Try again.");
      }
    });
  }

  const buttonClass = fullWidth ? "w-full" : "shrink-0";

  return (
    <div className={fullWidth ? "min-w-0 flex-1" : "shrink-0"}>
      {isFriend ? (
        <Button
          type="button"
          variant="secondary"
          size={size}
          className={buttonClass}
          onClick={() => setSheetOpen(true)}
          aria-label={`Added ${name}`}
        >
          Added
        </Button>
      ) : (
        <Button
          type="button"
          variant="primary"
          size={size}
          className={buttonClass}
          onClick={handleAdd}
          aria-label={`Add ${name}`}
        >
          Add
        </Button>
      )}

      {error && (
        <p role="alert" className="mt-2 text-right text-sm text-danger">
          {error}
        </p>
      )}

      {sheetOpen && (
        <Sheet label={`Friend options for ${name}`} onClose={closeSheet}>
          {confirming ? (
            <div className="space-y-2 pb-2">
              <p className="px-2 pb-2 text-center text-sm text-muted">
                {name} will be removed from your friends. You can add them again anytime.
              </p>
              <button
                type="button"
                onClick={handleRemove}
                className="flex min-h-12 w-full items-center justify-center rounded-xl text-[17px] font-semibold text-danger transition-colors duration-200 ease-out hover:bg-surface-2"
              >
                Remove {name}
              </button>
              <button
                type="button"
                onClick={closeSheet}
                className="flex min-h-12 w-full items-center justify-center rounded-xl text-[17px] font-semibold text-text transition-colors duration-200 ease-out hover:bg-surface-2"
              >
                Cancel
              </button>
            </div>
          ) : (
            <div className="space-y-2 pb-2">
              <button
                type="button"
                onClick={() => setConfirming(true)}
                className="flex min-h-12 w-full items-center justify-center rounded-xl text-[17px] font-semibold text-danger transition-colors duration-200 ease-out hover:bg-surface-2"
              >
                Remove {name}
              </button>
              <button
                type="button"
                onClick={closeSheet}
                className="flex min-h-12 w-full items-center justify-center rounded-xl text-[17px] font-semibold text-text transition-colors duration-200 ease-out hover:bg-surface-2"
              >
                Cancel
              </button>
            </div>
          )}
        </Sheet>
      )}

      <Toast message={toast} onDone={() => setToast(null)} />
    </div>
  );
}
