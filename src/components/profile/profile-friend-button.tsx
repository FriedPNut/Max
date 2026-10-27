"use client";

import { FriendToggle } from "@/components/friends/friend-toggle";
import type { ProfileRelationship } from "@/lib/profile";

export function ProfileFriendButton({
  profileId,
  name,
  initialRelationship,
}: {
  profileId: string;
  name: string;
  initialRelationship: ProfileRelationship;
}) {
  return (
    <FriendToggle
      friendId={profileId}
      name={name}
      initialFriend={initialRelationship === "friend"}
      size="md"
      fullWidth
    />
  );
}
