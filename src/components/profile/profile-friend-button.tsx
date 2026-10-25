"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { requestProfileFriendshipAction } from "@/app/actions/profile";
import type { ProfileRelationship } from "@/lib/profile";

export function ProfileFriendButton({
  profileId,
  initialRelationship,
}: {
  profileId: string;
  initialRelationship: ProfileRelationship;
}) {
  const router = useRouter();
  const [relationship, setRelationship] =
    useState<ProfileRelationship>(initialRelationship);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleAdd() {
    if (pending) {
      return;
    }

    setError(null);

    startTransition(async () => {
      try {
        const result = await requestProfileFriendshipAction(profileId);

        if (result.error) {
          setError(result.error);
          return;
        }

        if (result.relationship) {
          setRelationship(result.relationship);
          router.refresh();
        }
      } catch {
        setError("Couldn't send that request. Try again.");
      }
    });
  }

  const isFriend = relationship === "friend";
  const isSent = relationship === "sent";
  const isIncoming = relationship === "incoming";

  return (
    <div>
      {isFriend ? (
        <button
          type="button"
          disabled
          className="w-full min-h-11 px-4 py-3 rounded-lg border border-border bg-transparent text-muted font-sans font-medium text-sm cursor-default"
        >
          Friends
        </button>
      ) : isSent ? (
        <button
          type="button"
          disabled
          className="w-full min-h-11 px-4 py-3 rounded-lg border border-border bg-transparent text-muted font-sans font-medium text-sm cursor-default"
        >
          Request sent
        </button>
      ) : isIncoming ? (
        <button
          type="button"
          onClick={handleAdd}
          disabled={pending}
          className="w-full min-h-11 px-4 py-3 rounded-lg bg-text text-background font-sans font-medium text-sm transition-opacity duration-150 ease-out hover:opacity-90 cursor-pointer disabled:opacity-60 disabled:pointer-events-none"
        >
          {pending ? "Accepting..." : "Accept"}
        </button>
      ) : (
        <button
          type="button"
          onClick={handleAdd}
          disabled={pending}
          className="w-full min-h-11 px-4 py-3 rounded-lg bg-text text-background font-sans font-medium text-sm transition-opacity duration-150 ease-out hover:opacity-90 cursor-pointer disabled:opacity-60 disabled:pointer-events-none"
        >
          {pending ? "Adding..." : "Add friend"}
        </button>
      )}

      {error && (
        <p role="alert" className="mt-2 text-sm text-text">
          {error}
        </p>
      )}
    </div>
  );
}
