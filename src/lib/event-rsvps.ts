import type { createClient } from "@/lib/supabase/server";
import { resolveProfileAvatarUrls } from "@/lib/profile-data";
import {
  isRsvpStatus,
  RSVP_STATUSES,
  type RsvpGroups,
  type RsvpPerson,
  type RsvpSnapshot,
  type RsvpStatus,
} from "@/lib/events";

type ServerClient = Awaited<ReturnType<typeof createClient>>;

type RsvpRow = {
  user_id: string;
  status: string;
  created_at: string;
};

type RsvpProfile = {
  id: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
};

export type RsvpSnapshotResult = {
  snapshot?: RsvpSnapshot;
  error?: string;
};

export async function loadRsvpSnapshot(
  supabase: ServerClient,
  {
    eventId,
    currentUserId,
    currentUserName,
    capacity,
  }: {
    eventId: string;
    currentUserId: string;
    currentUserName?: string;
    capacity: number | null;
  }
): Promise<RsvpSnapshotResult> {
  const { data, error } = await supabase
    .from("rsvps")
    .select("user_id,status,created_at")
    .eq("event_id", eventId)
    .order("created_at", { ascending: true });

  if (error) {
    return {
      error: "Couldn't load who's coming. Refresh and try again.",
    };
  }

  const rows = ((data ?? []) as RsvpRow[])
    .filter((row) => isRsvpStatus(row.status))
    .sort(
      (a, b) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
  const userIds = [...new Set(rows.map((row) => row.user_id))];
  let profiles: RsvpProfile[] = [];

  if (userIds.length > 0) {
    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .select("id,display_name,username,avatar_url")
      .in("id", userIds);

    if (profileError) {
      return {
        error: "Couldn't load who's coming. Refresh and try again.",
      };
    }

    profiles = (profileData ?? []) as RsvpProfile[];
  }

  const profilesById = new Map(
    profiles.map((profile) => [profile.id, profile])
  );
  const avatarUrls = await resolveProfileAvatarUrls(supabase, profiles);
  const waitlistRows = rows.filter((row) => row.status === "waitlist");
  const waitlistPositions = new Map(
    waitlistRows.map((row, index) => [row.user_id, index + 1])
  );
  const groups: RsvpGroups = {
    going: [],
    maybe: [],
    no: [],
    waitlist: [],
  };

  for (const row of rows) {
    const status = row.status as RsvpStatus;
    const profile = profilesById.get(row.user_id);
    const profileName = profile?.display_name?.trim();
    const username = profile?.username?.trim() || null;
    const name =
      profileName ||
      username ||
      (row.user_id === currentUserId ? currentUserName?.trim() : "") ||
      "A friend";
    const person: RsvpPerson = {
      id: row.user_id,
      name,
      username,
      avatarUrl: avatarUrls.get(row.user_id) ?? null,
      waitlistPosition:
        status === "waitlist"
          ? waitlistPositions.get(row.user_id) ?? null
          : null,
    };

    groups[status].push(person);
  }

  for (const status of RSVP_STATUSES) {
    if (status === "waitlist") {
      continue;
    }

    groups[status].sort((a, b) => a.name.localeCompare(b.name));
  }

  const current = rows.find((row) => row.user_id === currentUserId) ?? null;

  return {
    snapshot: {
      currentStatus: current ? (current.status as RsvpStatus) : null,
      waitlistPosition:
        current?.status === "waitlist"
          ? waitlistPositions.get(currentUserId) ?? null
          : null,
      goingCount: groups.going.length,
      totalAnswers: rows.length,
      capacity,
      groups,
    },
  };
}
