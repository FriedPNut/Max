"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import {
  ITEM_NOTE_MAX,
  ITEM_TITLE_MAX,
  LIST_TITLE_MAX,
  cleanLink,
  isListKind,
} from "@/lib/lists";

export type ListActionResult = {
  error?: string;
  id?: string;
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

export async function createListAction(input: {
  title: string;
  kind: string;
}): Promise<ListActionResult> {
  const title = String(input?.title ?? "").trim();
  const kind = String(input?.kind ?? "");
  const { supabase, user } = await requireUser();

  if (!title) {
    return { error: "Give the list a name." };
  }

  if (title.length > LIST_TITLE_MAX) {
    return { error: `Keep the name under ${LIST_TITLE_MAX} characters.` };
  }

  if (!isListKind(kind)) {
    return { error: "Pick a kind for the list." };
  }

  const { data, error } = await supabase
    .from("lists")
    .insert({ title, kind, created_by: user.id })
    .select("id")
    .single();

  if (error || !data) {
    return { error: "Couldn't create that list. Try again." };
  }

  revalidatePath("/lists");
  return { id: data.id as string };
}

export async function renameListAction(input: {
  listId: string;
  title: string;
}): Promise<ListActionResult> {
  const title = String(input?.title ?? "").trim();
  const { supabase, user } = await requireUser();

  if (!title) {
    return { error: "Give the list a name." };
  }

  if (title.length > LIST_TITLE_MAX) {
    return { error: `Keep the name under ${LIST_TITLE_MAX} characters.` };
  }

  const { data, error } = await supabase
    .from("lists")
    .update({ title })
    .eq("id", input.listId)
    .eq("created_by", user.id)
    .select("id");

  if (error) {
    return { error: "Couldn't rename that list. Try again." };
  }

  if (!data || data.length === 0) {
    return { error: "Only the list's creator can rename it." };
  }

  revalidatePath("/lists");
  revalidatePath(`/lists/${input.listId}`);
  return {};
}

export async function deleteListAction(
  listId: string
): Promise<ListActionResult> {
  const { supabase, user } = await requireUser();
  const { data, error } = await supabase
    .from("lists")
    .delete()
    .eq("id", listId)
    .eq("created_by", user.id)
    .select("id");

  if (error) {
    return { error: "Couldn't delete that list. Try again." };
  }

  if (!data || data.length === 0) {
    return { error: "Only the list's creator can delete it." };
  }

  revalidatePath("/lists");
  return {};
}

export async function addListItemAction(input: {
  listId: string;
  title: string;
  note: string;
  url: string;
}): Promise<ListActionResult> {
  const title = String(input?.title ?? "").trim();
  const note = String(input?.note ?? "").trim();
  const rawUrl = String(input?.url ?? "").trim();
  const { supabase, user } = await requireUser();

  if (!title) {
    return { error: "Give the item a name." };
  }

  if (title.length > ITEM_TITLE_MAX) {
    return { error: `Keep the name under ${ITEM_TITLE_MAX} characters.` };
  }

  if (note.length > ITEM_NOTE_MAX) {
    return { error: `Keep the note under ${ITEM_NOTE_MAX} characters.` };
  }

  const url = cleanLink(rawUrl);

  if (rawUrl && !url) {
    return { error: "That link doesn't look right." };
  }

  const { data, error } = await supabase
    .from("list_items")
    .insert({
      list_id: input.listId,
      title,
      note: note || null,
      url,
      added_by: user.id,
    })
    .select("id")
    .single();

  if (error || !data) {
    return { error: "Couldn't add that item. Try again." };
  }

  revalidatePath(`/lists/${input.listId}`);
  return { id: data.id as string };
}

export async function toggleListItemVoteAction(
  itemId: string,
  voted: boolean
): Promise<ListActionResult> {
  const { supabase, user } = await requireUser();

  if (voted) {
    const { error } = await supabase
      .from("list_item_votes")
      .delete()
      .eq("item_id", itemId)
      .eq("user_id", user.id);

    if (error) {
      return { error: "Couldn't save your vote. Try again." };
    }
  } else {
    const { error } = await supabase
      .from("list_item_votes")
      .insert({ item_id: itemId, user_id: user.id });

    if (error && error.code !== "23505") {
      return { error: "Couldn't save your vote. Try again." };
    }
  }

  return {};
}

export async function setListItemDoneAction(
  itemId: string,
  done: boolean
): Promise<ListActionResult> {
  const { supabase, user } = await requireUser();
  const { error } = await supabase
    .from("list_items")
    .update({
      done,
      done_at: done ? new Date().toISOString() : null,
      done_by: done ? user.id : null,
    })
    .eq("id", itemId);

  if (error) {
    return { error: "Couldn't update that item. Try again." };
  }

  return {};
}

export async function deleteListItemAction(
  itemId: string
): Promise<ListActionResult> {
  const { supabase, user } = await requireUser();

  const { data: item, error: readError } = await supabase
    .from("list_items")
    .select("id,added_by,list_id,lists!inner(created_by)")
    .eq("id", itemId)
    .maybeSingle();

  if (readError) {
    return { error: "Couldn't delete that item. Try again." };
  }

  if (!item) {
    return { error: "That item is gone." };
  }

  const listCreator = (item as unknown as { lists: { created_by: string } })
    .lists?.created_by;

  if (item.added_by !== user.id && listCreator !== user.id) {
    return { error: "Only the person who added it or the list's creator can delete it." };
  }

  const { error } = await supabase
    .from("list_items")
    .delete()
    .eq("id", itemId);

  if (error) {
    return { error: "Couldn't delete that item. Try again." };
  }

  revalidatePath(`/lists/${item.list_id}`);
  return {};
}

export async function suggestListItemAsIdeaAction(
  itemId: string
): Promise<ListActionResult & { ideaId?: string }> {
  const { supabase, user } = await requireUser();

  const { data: item, error: readError } = await supabase
    .from("list_items")
    .select("id,title,note,event_idea_id,list_id")
    .eq("id", itemId)
    .maybeSingle();

  if (readError || !item) {
    return { error: "Couldn't find that item. Try again." };
  }

  if (item.event_idea_id) {
    return { error: "This item is already in ideas.", ideaId: item.event_idea_id };
  }

  const { data: idea, error: ideaError } = await supabase
    .from("event_ideas")
    .insert({
      title: item.title,
      description: item.note,
      created_by: user.id,
      status: "open",
    })
    .select("id")
    .single();

  if (ideaError || !idea) {
    return { error: "Couldn't suggest that idea. Try again." };
  }

  const { error: linkError } = await supabase
    .from("list_items")
    .update({ event_idea_id: idea.id })
    .eq("id", itemId)
    .is("event_idea_id", null);

  if (linkError) {
    return { error: "Couldn't link that idea. Try again." };
  }

  revalidatePath(`/lists/${item.list_id}`);
  revalidatePath("/events/ideas");
  return { ideaId: idea.id as string };
}
