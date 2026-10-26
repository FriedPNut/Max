"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { requestProfileFriendshipAction } from "@/app/actions/profile";
import { Button } from "@/components/ui";
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
    <div className="min-w-0 flex-1">
      {isFriend ? (
        <Button variant="secondary" disabled className="w-full text-muted">
          Friends
        </Button>
      ) : isSent ? (
        <Button variant="secondary" disabled className="w-full text-muted">
          Request sent
        </Button>
      ) : isIncoming ? (
        <Button
          variant="primary"
          onClick={handleAdd}
          disabled={pending}
          className="w-full"
        >
          {pending ? "Accepting..." : "Accept"}
        </Button>
      ) : (
        <Button
          variant="primary"
          onClick={handleAdd}
          disabled={pending}
          className="w-full"
        >
          {pending ? "Adding..." : "Add friend"}
        </Button>
      )}

      {error && (
        <p role="alert" className="mt-2 text-sm text-text">
          {error}
        </p>
      )}
    </div>
  );
}
