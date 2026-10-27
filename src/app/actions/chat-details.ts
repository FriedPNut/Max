"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { PHOTO_BUCKET, photoThumbPath } from "@/lib/photo-urls";
import { isConversationPhotoPath } from "@/lib/chat-photo";
import { cleanGroupName, cleanNickname } from "@/lib/chat-details";
import { openDmWith } from "@/lib/dm";

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

type ServerClient = Awaited<ReturnType<typeof createClient>>;

function refreshConversation(conversationId: string) {
  revalidatePath("/chat");
  revalidatePath(`/chat/${conversationId}`);
  revalidatePath(`/chat/${conversationId}/details`);
  revalidatePath(`/chat/${conversationId}/search`);
}

async function loadConversation(
  supabase: ServerClient,
  conversationId: string
) {
  const { data } = await supabase
    .from("conversations")
    .select("id,name,is_group,created_by,photo_path")
    .eq("id", conversationId)
    .maybeSingle();

  return data as {
    id: string;
    name: string | null;
    is_group: boolean;
    created_by: string;
    photo_path: string | null;
  } | null;
}

async function isMember(
  supabase: ServerClient,
  conversationId: string,
  userId: string
) {
  const { data } = await supabase
    .from("conversation_members")
    .select("conversation_id")
    .eq("conversation_id", conversationId)
    .eq("user_id", userId)
    .maybeSingle();

  return Boolean(data);
}

async function acceptedFriendIds(supabase: ServerClient, userId: string) {
  const { data } = await supabase
    .from("friendships")
    .select("requester_id,addressee_id")
    .eq("status", "accepted")
    .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`);

  const ids = new Set<string>();

  for (const row of (data ?? []) as {
    requester_id: string;
    addressee_id: string;
  }[]) {
    ids.add(row.requester_id === userId ? row.addressee_id : row.requester_id);
  }

  return ids;
}

async function existingMemberIds(
  supabase: ServerClient,
  conversationId: string
) {
  const { data } = await supabase
    .from("conversation_members")
    .select("user_id")
    .eq("conversation_id", conversationId);

  return new Set(
    ((data ?? []) as { user_id: string }[]).map((row) => row.user_id)
  );
}

/** Any member of a group can rename it. */
export async function renameConversationGroupAction(
  conversationId: string,
  name: string
): Promise<{ error?: string; name?: string }> {
  const clean = cleanGroupName(name);

  if (!clean) {
    return { error: "Give the group a name." };
  }

  const { supabase, user } = await requireUser();
  const conversation = await loadConversation(supabase, conversationId);

  if (!conversation || !conversation.is_group) {
    return { error: "That group isn't available." };
  }

  if (!(await isMember(supabase, conversationId, user.id))) {
    return { error: "You're not in this group." };
  }

  const { error } = await supabase
    .from("conversations")
    .update({ name: clean })
    .eq("id", conversationId);

  if (error) {
    return { error: "Couldn't rename that group. Try again." };
  }

  refreshConversation(conversationId);
  return { name: clean };
}

/** Any member of a group can change its photo. Old files go, best effort. */
export async function setConversationPhotoAction(
  conversationId: string,
  photoPath: string
): Promise<{ error?: string }> {
  if (!isConversationPhotoPath(photoPath)) {
    return { error: "That photo didn't upload properly. Try again." };
  }

  const { supabase, user } = await requireUser();
  const conversation = await loadConversation(supabase, conversationId);

  if (!conversation || !conversation.is_group) {
    return { error: "That group isn't available." };
  }

  if (!(await isMember(supabase, conversationId, user.id))) {
    return { error: "You're not in this group." };
  }

  const { error } = await supabase
    .from("conversations")
    .update({ photo_path: photoPath })
    .eq("id", conversationId);

  if (error) {
    return { error: "Couldn't save that photo. Try again." };
  }

  const previous = conversation.photo_path?.trim();

  if (previous && previous !== photoPath) {
    try {
      await supabase.storage
        .from(PHOTO_BUCKET)
        .remove([previous, photoThumbPath(previous)]);
    } catch {
      // Leftover files are harmless; the new photo is already saved.
    }
  }

  refreshConversation(conversationId);
  return {};
}

export async function setConversationMutedAction(
  conversationId: string,
  muted: boolean
): Promise<{ error?: string }> {
  const { supabase, user } = await requireUser();

  const { error } = await supabase
    .from("conversation_members")
    .update({ muted })
    .eq("conversation_id", conversationId)
    .eq("user_id", user.id);

  if (error) {
    return { error: "Couldn't change that. Try again." };
  }

  refreshConversation(conversationId);
  return {};
}

/** Nicknames are shared: everyone in the chat sees the same one. */
export async function setConversationNicknameAction(
  conversationId: string,
  userId: string,
  nickname: string
): Promise<{ error?: string; nickname?: string | null }> {
  const clean = cleanNickname(nickname);
  const { supabase, user } = await requireUser();

  if (!(await isMember(supabase, conversationId, user.id))) {
    return { error: "You're not in this chat." };
  }

  if (!(await isMember(supabase, conversationId, userId))) {
    return { error: "That person isn't in this chat." };
  }

  if (clean === null) {
    const { error } = await supabase
      .from("conversation_nicknames")
      .delete()
      .eq("conversation_id", conversationId)
      .eq("user_id", userId);

    if (error) {
      return { error: "Couldn't clear that nickname. Try again." };
    }

    refreshConversation(conversationId);
    return { nickname: null };
  }

  // Replace rather than upsert, so this works whatever the table's key is.
  const { error: clearError } = await supabase
    .from("conversation_nicknames")
    .delete()
    .eq("conversation_id", conversationId)
    .eq("user_id", userId);

  if (clearError) {
    return { error: "Couldn't save that nickname. Try again." };
  }

  const { error } = await supabase.from("conversation_nicknames").insert({
    conversation_id: conversationId,
    user_id: userId,
    nickname: clean,
  });

  if (error) {
    return { error: "Couldn't save that nickname. Try again." };
  }

  refreshConversation(conversationId);
  return { nickname: clean };
}

/**
 * Adds friends to a group, or turns a DM into a group with the chosen friends
 * plus the two people already in the DM. The DM itself is never modified.
 *
 * The insert is all the notification side needs: a database trigger on
 * conversation_members notifies the people who were added.
 */
export async function addPeopleAction(input: {
  conversationId: string;
  userIds: string[];
  groupName?: string;
}): Promise<{
  error?: string;
  conversationId?: string;
  addedIds?: string[];
}> {
  const conversationId = String(input?.conversationId ?? "");
  const requested = [
    ...new Set(
      (input?.userIds ?? []).map((id) => String(id ?? "").trim()).filter(Boolean)
    ),
  ];
  const { supabase, user } = await requireUser();

  if (requested.length === 0) {
    return { error: "Pick at least one friend." };
  }

  const conversation = await loadConversation(supabase, conversationId);

  if (!conversation) {
    return { error: "That chat isn't available." };
  }

  if (!(await isMember(supabase, conversationId, user.id))) {
    return { error: "You're not in this chat." };
  }

  const friends = await acceptedFriendIds(supabase, user.id);
  const chosen = requested.filter(
    (id) => id !== user.id && friends.has(id)
  );

  if (chosen.length === 0) {
    return { error: "You can only add friends." };
  }

  if (conversation.is_group) {
    const current = await existingMemberIds(supabase, conversationId);
    const fresh = chosen.filter((id) => !current.has(id));

    if (fresh.length === 0) {
      return { error: "They're already in this chat." };
    }

    const { error } = await supabase.from("conversation_members").insert(
      fresh.map((userId) => ({ conversation_id: conversationId, user_id: userId }))
    );

    if (error) {
      return { error: "Couldn't add everyone. Try again." };
    }

    refreshConversation(conversationId);
    return { conversationId, addedIds: fresh };
  }

  // A DM becomes a brand-new group; the DM keeps its own history.
  const { data: dmMembers } = await supabase
    .from("conversation_members")
    .select("user_id")
    .eq("conversation_id", conversationId);

  const others = ((dmMembers ?? []) as { user_id: string }[])
    .map((row) => row.user_id)
    .filter((id) => id !== user.id);

  const name = cleanGroupName(input?.groupName ?? null);

  const { data: created, error: createError } = await supabase
    .from("conversations")
    .insert({
      name,
      is_group: true,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (createError || !created) {
    return { error: "Couldn't start that group. Try again." };
  }

  const memberRows = [user.id, ...others, ...chosen].map((userId) => ({
    conversation_id: created.id,
    user_id: userId,
  }));

  const { error: memberError } = await supabase
    .from("conversation_members")
    .insert(memberRows);

  if (memberError) {
    await supabase.from("conversations").delete().eq("id", created.id);
    return { error: "Couldn't start that group. Try again." };
  }

  revalidatePath("/chat");
  return { conversationId: created.id as string, addedIds: chosen };
}

/** Only the creator can remove someone else from the group. */
export async function removeConversationMemberAction(
  conversationId: string,
  userId: string
): Promise<{ error?: string }> {
  const { supabase, user } = await requireUser();
  const conversation = await loadConversation(supabase, conversationId);

  if (!conversation || !conversation.is_group) {
    return { error: "That group isn't available." };
  }

  if (conversation.created_by !== user.id) {
    return { error: "Only the group's creator can remove people." };
  }

  if (userId === user.id || userId === conversation.created_by) {
    return { error: "The creator can't be removed." };
  }

  const { error } = await supabase
    .from("conversation_members")
    .delete()
    .eq("conversation_id", conversationId)
    .eq("user_id", userId);

  if (error) {
    return { error: "Couldn't remove that person. Try again." };
  }

  refreshConversation(conversationId);
  return {};
}

/**
 * Leaving deletes my member row. The creator holds the group, so they can't
 * leave until it is handed over; the screen offers clearing it instead.
 */
export async function leaveConversationChatAction(
  conversationId: string
): Promise<{ error?: string; left?: boolean }> {
  const { supabase, user } = await requireUser();
  const conversation = await loadConversation(supabase, conversationId);

  if (!conversation || !conversation.is_group) {
    return { error: "That group isn't available." };
  }

  if (conversation.created_by === user.id) {
    return { error: "Hand the group over before you leave it." };
  }

  const { error } = await supabase
    .from("conversation_members")
    .delete()
    .eq("conversation_id", conversationId)
    .eq("user_id", user.id);

  if (error) {
    return { error: "Couldn't leave that group. Try again." };
  }

  revalidatePath("/chat");
  return { left: true };
}

/** Clears my history: older messages stop showing and the chat leaves my list. */
export async function deleteChatForMeAction(
  conversationId: string
): Promise<{ error?: string; clearedAt?: string }> {
  const { supabase, user } = await requireUser();
  const clearedAt = new Date().toISOString();

  const { error } = await supabase
    .from("conversation_members")
    .update({ cleared_at: clearedAt, last_read_at: clearedAt })
    .eq("conversation_id", conversationId)
    .eq("user_id", user.id);

  if (error) {
    return { error: "Couldn't clear this chat. Try again." };
  }

  revalidatePath("/chat");
  revalidatePath(`/chat/${conversationId}`);
  return { clearedAt };
}

/** The member menu's "Message": open (or start) the DM with that person. */
export async function openConversationWithMemberAction(
  userId: string
): Promise<{ error?: string; conversationId?: string }> {
  const { supabase, user } = await requireUser();
  const target = String(userId ?? "").trim();

  if (!target || target === user.id) {
    return { error: "Pick someone else." };
  }

  const friends = await acceptedFriendIds(supabase, user.id);

  if (!friends.has(target)) {
    return { error: "You can only message friends." };
  }

  const dm = await openDmWith(supabase, user.id, target);

  if ("error" in dm) {
    return { error: dm.error };
  }

  return { conversationId: dm.id };
}
