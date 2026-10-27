import type { createClient } from "@/lib/supabase/server";

type ServerClient = Awaited<ReturnType<typeof createClient>>;

/** The existing one-to-one chat with this friend, if there is one. */
export async function findDmConversation(
  supabase: ServerClient,
  userId: string,
  friendId: string
) {
  const { data: myMemberships } = await supabase
    .from("conversation_members")
    .select("conversation_id")
    .eq("user_id", userId);

  const conversationIds = (myMemberships ?? []).map(
    (row: { conversation_id: string }) => row.conversation_id
  );

  if (conversationIds.length === 0) {
    return null;
  }

  const { data: directConversations } = await supabase
    .from("conversations")
    .select("id,is_group")
    .in("id", conversationIds)
    .eq("is_group", false);

  const dmIds = (directConversations ?? []).map(
    (row: { id: string }) => row.id
  );

  if (dmIds.length === 0) {
    return null;
  }

  const { data: members } = await supabase
    .from("conversation_members")
    .select("conversation_id,user_id")
    .in("conversation_id", dmIds);

  const membersByConversation = new Map<string, Set<string>>();

  for (const member of (members ?? []) as {
    conversation_id: string;
    user_id: string;
  }[]) {
    const existing = membersByConversation.get(member.conversation_id);

    if (existing) {
      existing.add(member.user_id);
    } else {
      membersByConversation.set(
        member.conversation_id,
        new Set([member.user_id])
      );
    }
  }

  for (const dmId of dmIds) {
    const memberIds = membersByConversation.get(dmId);

    if (
      memberIds &&
      memberIds.size === 2 &&
      memberIds.has(userId) &&
      memberIds.has(friendId)
    ) {
      return dmId;
    }
  }

  return null;
}

export async function createDmConversation(
  supabase: ServerClient,
  userId: string,
  friendId: string
) {
  const { data: conversation, error } = await supabase
    .from("conversations")
    .insert({
      name: null,
      is_group: false,
      created_by: userId,
    })
    .select("id")
    .single();

  if (error || !conversation) {
    return { error: "Couldn't start that chat. Try again." } as const;
  }

  const { error: memberError } = await supabase
    .from("conversation_members")
    .insert([
      { conversation_id: conversation.id, user_id: userId },
      { conversation_id: conversation.id, user_id: friendId },
    ]);

  if (memberError) {
    await supabase.from("conversations").delete().eq("id", conversation.id);
    return { error: "Couldn't start that chat. Try again." } as const;
  }

  return { id: conversation.id as string } as const;
}

/** Find or start the DM, returning its id. */
export async function openDmWith(
  supabase: ServerClient,
  userId: string,
  friendId: string
): Promise<{ id: string } | { error: string }> {
  const existing = await findDmConversation(supabase, userId, friendId);

  if (existing) {
    return { id: existing };
  }

  return createDmConversation(supabase, userId, friendId);
}
