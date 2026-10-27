"use server";

import { redirect } from "next/navigation";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { CHAT_BUCKET, MESSAGE_SELECT, type MessageRecord } from "@/lib/chat";

export type MessageActionResult = {
  error?: string;
  message?: MessageRecord;
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

export async function editMessageAction(
  messageId: string,
  body: string
): Promise<MessageActionResult> {
  const text = String(body ?? "").trim();
  const { supabase, user } = await requireUser();

  if (!messageId) {
    return { error: "We couldn't find that message." };
  }

  if (!text) {
    return { error: "A message can't be empty." };
  }

  if (text.length > 2000) {
    return { error: "That message is too long." };
  }

  const { data, error } = await supabase
    .from("messages")
    .update({ body: text, edited_at: new Date().toISOString() })
    .eq("id", messageId)
    .eq("user_id", user.id)
    .is("deleted_at", null)
    .select(MESSAGE_SELECT)
    .maybeSingle();

  if (error) {
    return { error: "Couldn't save that edit. Try again." };
  }

  if (!data) {
    return { error: "That message can't be edited." };
  }

  return { message: data as unknown as MessageRecord };
}

export async function deleteMessageAction(
  messageId: string
): Promise<MessageActionResult> {
  const { supabase, user } = await requireUser();

  if (!messageId) {
    return { error: "We couldn't find that message." };
  }

  const { data: existing, error: readError } = await supabase
    .from("messages")
    .select("id,image_path")
    .eq("id", messageId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (readError) {
    return { error: "Couldn't delete that message. Try again." };
  }

  if (!existing) {
    return { error: "That message isn't yours to delete." };
  }

  const { data, error } = await supabase
    .from("messages")
    .update({
      deleted_at: new Date().toISOString(),
      body: null,
      image_path: null,
    })
    .eq("id", messageId)
    .eq("user_id", user.id)
    .select(MESSAGE_SELECT)
    .maybeSingle();

  if (error || !data) {
    return { error: "Couldn't delete that message. Try again." };
  }

  if (existing.image_path) {
    await supabase.storage.from(CHAT_BUCKET).remove([existing.image_path]);
  }

  return { message: data as unknown as MessageRecord };
}

export async function sendPhotoMessageAction(input: {
  conversationId: string;
  imagePath: string;
  caption: string;
}): Promise<MessageActionResult> {
  const conversationId = String(input?.conversationId ?? "").trim();
  const imagePath = String(input?.imagePath ?? "").trim();
  const caption = String(input?.caption ?? "").trim();
  const { supabase, user } = await requireUser();
  const prefix = `chat/${user.id}/`;

  if (!conversationId) {
    return { error: "We couldn't find that chat." };
  }

  if (
    !imagePath.startsWith(prefix) ||
    !/^\d+\.(jpg|png|webp|gif|heic|heif)$/.test(imagePath.slice(prefix.length))
  ) {
    return { error: "That photo didn't upload right. Try again." };
  }

  if (caption.length > 2000) {
    return { error: "That caption is too long." };
  }

  const { data, error } = await supabase
    .from("messages")
    .insert({
      conversation_id: conversationId,
      user_id: user.id,
      body: caption || null,
      image_path: imagePath,
    })
    .select(MESSAGE_SELECT)
    .single();

  if (error || !data) {
    await supabase.storage.from(CHAT_BUCKET).remove([imagePath]);
    return { error: "Couldn't send that photo. Try again." };
  }

  return { message: data as unknown as MessageRecord };
}

export async function signChatImagesAction(
  paths: string[]
): Promise<{ error?: string; urls?: Record<string, string> }> {
  const { supabase, user } = await requireUser();
  const cleanPaths = [...new Set(paths.map((p) => String(p ?? "").trim()))].filter(
    (p) => p.startsWith("chat/") && p.length < 300
  );

  if (cleanPaths.length === 0) {
    return { urls: {} };
  }

  // Only sign paths that belong to a message the viewer can read (RLS applies).
  const { data: rows, error: rowError } = await supabase
    .from("messages")
    .select("image_path")
    .in("image_path", cleanPaths);

  if (rowError) {
    return { error: "Couldn't load photos. Refresh and try again." };
  }

  const allowed = [
    ...new Set(((rows ?? []) as { image_path: string }[]).map((r) => r.image_path)),
  ];

  if (allowed.length === 0) {
    return { urls: {} };
  }

  const { data, error } = await supabase.storage
    .from(CHAT_BUCKET)
    .createSignedUrls(allowed, 60 * 60);

  if (error) {
    return { error: "Couldn't load photos. Refresh and try again." };
  }

  const urls: Record<string, string> = {};

  for (const item of (data ?? []) as { path: string | null; signedUrl: string }[]) {
    if (item.path && item.signedUrl) urls[item.path] = item.signedUrl;
  }

  return { urls };
}

function escapeLike(value: string) {
  return value.replace(/[\\%_]/g, (char) => `\\${char}`);
}

export async function searchConversationAction(
  conversationId: string,
  query: string
): Promise<{ error?: string; results?: MessageRecord[] }> {
  const term = String(query ?? "").trim();
  const { supabase } = await requireUser();

  if (!conversationId || term.length < 2) {
    return { results: [] };
  }

  const { data, error } = await supabase
    .from("messages")
    .select(MESSAGE_SELECT)
    .eq("conversation_id", conversationId)
    .is("deleted_at", null)
    .ilike("body", `%${escapeLike(term)}%`)
    .order("created_at", { ascending: false })
    .limit(30);

  if (error) {
    return { error: "Couldn't search this chat. Try again." };
  }

  return { results: (data ?? []) as unknown as MessageRecord[] };
}

export async function loadPinnedMessagesAction(
  conversationId: string
): Promise<{ error?: string; pins?: MessageRecord[] }> {
  const { supabase } = await requireUser();

  if (!conversationId) {
    return { pins: [] };
  }

  const { data: pinRows, error: pinError } = await supabase
    .from("pinned_messages")
    .select("message_id,pinned_at")
    .eq("conversation_id", conversationId)
    .order("pinned_at", { ascending: false });

  if (pinError) {
    return { error: "Couldn't load pinned messages." };
  }

  const ids = ((pinRows ?? []) as { message_id: string }[]).map(
    (row) => row.message_id
  );

  if (ids.length === 0) {
    return { pins: [] };
  }

  const { data, error } = await supabase
    .from("messages")
    .select(MESSAGE_SELECT)
    .in("id", ids)
    .is("deleted_at", null);

  if (error) {
    return { error: "Couldn't load pinned messages." };
  }

  const byId = new Map(
    ((data ?? []) as unknown as MessageRecord[]).map((m) => [m.id, m])
  );
  const pins = ids
    .map((id) => byId.get(id))
    .filter((m): m is MessageRecord => Boolean(m));

  return { pins };
}

export async function searchAllConversationsAction(
  query: string
): Promise<{
  error?: string;
  results?: (MessageRecord & { conversation_name: string })[];
}> {
  const term = String(query ?? "").trim();
  const { supabase, user } = await requireUser();

  if (term.length < 2) {
    return { results: [] };
  }

  const { data: memberships } = await supabase
    .from("conversation_members")
    .select("conversation_id")
    .eq("user_id", user.id);

  const ids = ((memberships ?? []) as { conversation_id: string }[]).map(
    (row) => row.conversation_id
  );

  if (ids.length === 0) {
    return { results: [] };
  }

  const { data, error } = await supabase
    .from("messages")
    .select(MESSAGE_SELECT)
    .in("conversation_id", ids)
    .is("deleted_at", null)
    .ilike("body", `%${escapeLike(term)}%`)
    .order("created_at", { ascending: false })
    .limit(30);

  if (error) {
    return { error: "Couldn't search your chats. Try again." };
  }

  const rows = (data ?? []) as unknown as MessageRecord[];
  const convoIds = [...new Set(rows.map((r) => r.conversation_id))];
  const { data: convos } = convoIds.length
    ? await supabase
        .from("conversations")
        .select("id,name,is_group")
        .in("id", convoIds)
    : { data: [] };
  const nameById = new Map(
    ((convos ?? []) as { id: string; name: string | null }[]).map((c) => [
      c.id,
      c.name?.trim() || "Chat",
    ])
  );

  return {
    results: rows.map((r) => ({
      ...r,
      conversation_name: nameById.get(r.conversation_id) ?? "Chat",
    })),
  };
}

export async function setMessagePinAction(
  messageId: string,
  pinned: boolean
): Promise<{ error?: string }> {
  const { supabase, user } = await requireUser();

  if (!messageId) {
    return { error: "We couldn't find that message." };
  }

  const { data: message, error: messageError } = await supabase
    .from("messages")
    .select("id,conversation_id")
    .eq("id", messageId)
    .maybeSingle();

  if (messageError || !message) {
    return { error: "That message is gone." };
  }

  if (pinned) {
    const { error } = await supabase.from("pinned_messages").insert({
      message_id: messageId,
      conversation_id: message.conversation_id,
      pinned_by: user.id,
    });

    if (error && error.code !== "23505") {
      return { error: "Couldn't pin that message. Try again." };
    }
  } else {
    const { error } = await supabase
      .from("pinned_messages")
      .delete()
      .eq("message_id", messageId);

    if (error) {
      return { error: "Couldn't unpin that message. Try again." };
    }
  }

  return {};
}
