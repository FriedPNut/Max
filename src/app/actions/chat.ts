"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";

export type ChatActionState = {
  error?: string;
  success?: boolean;
};

async function requireUser() {
  if (!isSupabaseConfigured()) {
    redirect("/login");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return { supabase, user };
}

function readText(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

async function acceptedFriendIds(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string
) {
  const { data } = await supabase
    .from("friendships")
    .select("requester_id,addressee_id")
    .eq("status", "accepted")
    .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`);

  const friendIds = new Set<string>();

  for (const row of (data ?? []) as {
    requester_id: string;
    addressee_id: string;
  }[]) {
    friendIds.add(
      row.requester_id === userId ? row.addressee_id : row.requester_id
    );
  }

  return friendIds;
}

async function findDmConversation(
  supabase: Awaited<ReturnType<typeof createClient>>,
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

async function createDmConversation(
  supabase: Awaited<ReturnType<typeof createClient>>,
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
    return { error: "Couldn't start that chat. Try again." };
  }

  const { error: memberError } = await supabase
    .from("conversation_members")
    .insert([
      { conversation_id: conversation.id, user_id: userId },
      { conversation_id: conversation.id, user_id: friendId },
    ]);

  if (memberError) {
    await supabase.from("conversations").delete().eq("id", conversation.id);
    return { error: "Couldn't start that chat. Try again." };
  }

  return { id: conversation.id as string };
}

export async function addFriendAction(
  _prevState: ChatActionState,
  formData: FormData
): Promise<ChatActionState> {
  const friendId = readText(formData, "friend_id");
  const { supabase, user } = await requireUser();

  if (!friendId || friendId === user.id) {
    return { error: "Couldn't add that person. Try again." };
  }

  const { error } = await supabase.from("friendships").insert({
    requester_id: user.id,
    addressee_id: friendId,
    status: "accepted",
  });

  // 23505 = the pair already has a row, so they are already friends.
  if (error && error.code !== "23505") {
    return { error: "Couldn't add that person. Try again." };
  }

  revalidatePath("/people");
  revalidatePath("/chat");
  revalidatePath("/chat/new");
  revalidatePath("/me");
  revalidatePath("/me/friends");
  revalidatePath("/u/[username]", "page");
  revalidatePath("/u/[username]/friends", "page");
  return { success: true };
}

export async function removeFriendAction(
  _prevState: ChatActionState,
  formData: FormData
): Promise<ChatActionState> {
  const friendId = readText(formData, "friend_id");
  const { supabase, user } = await requireUser();

  if (!friendId) {
    return { error: "Couldn't remove that person. Try again." };
  }

  const { error } = await supabase
    .from("friendships")
    .delete()
    .or(
      `and(requester_id.eq.${user.id},addressee_id.eq.${friendId}),and(requester_id.eq.${friendId},addressee_id.eq.${user.id})`
    );

  if (error) {
    return { error: "Couldn't remove that person. Try again." };
  }

  revalidatePath("/people");
  revalidatePath("/chat");
  revalidatePath("/chat/new");
  revalidatePath("/me");
  revalidatePath("/me/friends");
  revalidatePath("/u/[username]", "page");
  revalidatePath("/u/[username]/friends", "page");
  return { success: true };
}

export async function startDmWithFriendAction(
  _prevState: ChatActionState,
  formData: FormData
): Promise<ChatActionState> {
  const friendId = readText(formData, "friend_id");
  const { supabase, user } = await requireUser();

  if (!friendId || friendId === user.id) {
    return { error: "Pick a friend to message." };
  }

  const friendIds = await acceptedFriendIds(supabase, user.id);

  if (!friendIds.has(friendId)) {
    return { error: "You can only message friends." };
  }

  const existing = await findDmConversation(supabase, user.id, friendId);

  if (existing) {
    redirect(`/chat/${existing}`);
  }

  const created = await createDmConversation(supabase, user.id, friendId);

  if ("error" in created) {
    return created;
  }

  revalidatePath("/chat");
  redirect(`/chat/${created.id}`);
}

export async function createConversationAction(
  _prevState: ChatActionState,
  formData: FormData
): Promise<ChatActionState> {
  const selected = formData
    .getAll("friend_ids")
    .map((value) => String(value).trim())
    .filter(Boolean);
  const uniqueFriendIds = [...new Set(selected)];
  const { supabase, user } = await requireUser();
  const friendIds = uniqueFriendIds.filter((id) => id !== user.id);

  if (friendIds.length === 0) {
    return { error: "Pick at least one friend." };
  }

  const accepted = await acceptedFriendIds(supabase, user.id);

  if (friendIds.some((id) => !accepted.has(id))) {
    return { error: "You can only start chats with friends." };
  }

  if (friendIds.length === 1) {
    const existing = await findDmConversation(supabase, user.id, friendIds[0]);

    if (existing) {
      redirect(`/chat/${existing}`);
    }

    const created = await createDmConversation(supabase, user.id, friendIds[0]);

    if ("error" in created) {
      return created;
    }

    revalidatePath("/chat");
    redirect(`/chat/${created.id}`);
  }

  const name = readText(formData, "name");

  if (!name) {
    return { error: "Give the group a name." };
  }

  const { data: conversation, error } = await supabase
    .from("conversations")
    .insert({
      name,
      is_group: true,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (error || !conversation) {
    return { error: "Couldn't create that group. Try again." };
  }

  const memberRows = [user.id, ...friendIds].map((memberId) => ({
    conversation_id: conversation.id,
    user_id: memberId,
  }));

  const { error: memberError } = await supabase
    .from("conversation_members")
    .insert(memberRows);

  if (memberError) {
    await supabase.from("conversations").delete().eq("id", conversation.id);
    return { error: "Couldn't create that group. Try again." };
  }

  revalidatePath("/chat");
  redirect(`/chat/${conversation.id}`);
}

export async function renameConversationAction(
  conversationId: string,
  _prevState: ChatActionState,
  formData: FormData
): Promise<ChatActionState> {
  const name = readText(formData, "name");

  if (!conversationId) {
    return { error: "We couldn't find that group." };
  }

  if (!name) {
    return { error: "Give the group a name." };
  }

  const { supabase, user } = await requireUser();
  const { data, error } = await supabase
    .from("conversations")
    .update({ name })
    .eq("id", conversationId)
    .eq("created_by", user.id)
    .eq("is_group", true)
    .select("id")
    .maybeSingle();

  if (error) {
    return { error: "Couldn't rename that group. Try again." };
  }

  if (!data) {
    return { error: "Only the group's creator can rename it." };
  }

  revalidatePath("/chat");
  revalidatePath(`/chat/${conversationId}`);
  revalidatePath(`/chat/${conversationId}/members`);
  return { success: true };
}

export async function addConversationMemberAction(
  _prevState: ChatActionState,
  formData: FormData
): Promise<ChatActionState> {
  const conversationId = readText(formData, "conversation_id");
  const friendId = readText(formData, "friend_id");

  if (!conversationId || !friendId) {
    return { error: "We couldn't add that friend." };
  }

  const { supabase, user } = await requireUser();
  const { data: membership } = await supabase
    .from("conversation_members")
    .select("conversation_id")
    .eq("conversation_id", conversationId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership) {
    return { error: "You're not in this group." };
  }

  const { data: conversation } = await supabase
    .from("conversations")
    .select("id,is_group")
    .eq("id", conversationId)
    .maybeSingle();

  if (!conversation || !conversation.is_group) {
    return { error: "You can only add friends to groups." };
  }

  const friendIds = await acceptedFriendIds(supabase, user.id);

  if (!friendIds.has(friendId)) {
    return { error: "You can only add friends." };
  }

  const { error } = await supabase.from("conversation_members").insert({
    conversation_id: conversationId,
    user_id: friendId,
  });

  if (error) {
    if (error.code === "23505") {
      return { error: "They're already in this group." };
    }

    return { error: "Couldn't add that friend. Try again." };
  }

  revalidatePath("/chat");
  revalidatePath(`/chat/${conversationId}`);
  revalidatePath(`/chat/${conversationId}/members`);
  return { success: true };
}

export async function leaveConversationAction(
  _prevState: ChatActionState,
  formData: FormData
): Promise<ChatActionState> {
  const conversationId = readText(formData, "conversation_id");

  if (!conversationId) {
    return { error: "We couldn't find that group." };
  }

  const { supabase, user } = await requireUser();
  const { data: conversation } = await supabase
    .from("conversations")
    .select("id,is_group")
    .eq("id", conversationId)
    .maybeSingle();

  if (!conversation || !conversation.is_group) {
    return { error: "That group isn't available." };
  }

  const { data, error } = await supabase
    .from("conversation_members")
    .delete()
    .eq("conversation_id", conversationId)
    .eq("user_id", user.id)
    .select("conversation_id");

  if (error) {
    return { error: "Couldn't leave that group. Try again." };
  }

  if (!data || data.length === 0) {
    return { error: "You're not in this group anymore." };
  }

  revalidatePath("/chat");
  redirect("/chat");
}
