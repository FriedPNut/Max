import type { createClient } from "@/lib/supabase/server";
import {
  EVENT_CHAT_PAGE_SIZE,
  type EventChatProfile,
  type EventMessageRecord,
} from "@/lib/event-chat";

type ServerClient = Awaited<ReturnType<typeof createClient>>;

type ProfileRow = {
  id: string;
  display_name: string | null;
  username: string | null;
};

export type EventChatResult = {
  messages: EventMessageRecord[];
  profiles: EventChatProfile[];
  hasMore: boolean;
  error?: string;
};

export async function loadEventChat(
  supabase: ServerClient,
  {
    eventId,
    currentUserId,
    currentUserName,
  }: {
    eventId: string;
    currentUserId: string;
    currentUserName: string;
  }
): Promise<EventChatResult> {
  const { data, error } = await supabase
    .from("event_messages")
    .select("id,event_id,user_id,body,created_at")
    .eq("event_id", eventId)
    .order("created_at", { ascending: false })
    .limit(EVENT_CHAT_PAGE_SIZE);

  if (error) {
    return {
      messages: [],
      profiles: [
        {
          id: currentUserId,
          name: currentUserName,
          username: null,
        },
      ],
      hasMore: false,
      error: "Couldn't load messages. Refresh and try again.",
    };
  }

  const messages = ((data ?? []) as EventMessageRecord[]).slice().reverse();
  const userIds = [
    ...new Set([currentUserId, ...messages.map((message) => message.user_id)]),
  ];
  let profileRows: ProfileRow[] = [];

  if (userIds.length > 0) {
    const { data: profileData } = await supabase
      .from("profiles")
      .select("id,display_name,username")
      .in("id", userIds);

    profileRows = (profileData ?? []) as ProfileRow[];
  }

  const profilesById = new Map(
    profileRows.map((profile) => [profile.id, profile])
  );
  const profiles = userIds.map((id) => {
    const profile = profilesById.get(id);
    const username = profile?.username?.trim() || null;
    const name =
      profile?.display_name?.trim() ||
      username ||
      (id === currentUserId ? currentUserName : "A friend");

    return {
      id,
      name,
      username,
    };
  });

  return {
    messages,
    profiles,
    hasMore: messages.length === EVENT_CHAT_PAGE_SIZE,
  };
}
