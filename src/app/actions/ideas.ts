"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import type { IdeaListItem, IdeaStatus } from "@/lib/events";

export type CreateIdeaResult = {
  error?: string;
  idea?: IdeaListItem;
};

export type UpdateIdeaResult = {
  error?: string;
  title?: string;
  description?: string | null;
};

export type IdeaMutationResult = {
  error?: string;
  dropped?: boolean;
  deleted?: boolean;
};

export type IdeaVoteResult = {
  error?: string;
  voted?: boolean;
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

function readText(value: string | null | undefined) {
  return String(value ?? "").trim();
}

function revalidateIdeaPaths() {
  revalidatePath("/events");
  revalidatePath("/events/ideas");
}

export async function createIdeaAction(
  title: string,
  description: string
): Promise<CreateIdeaResult> {
  const cleanTitle = readText(title);

  if (!cleanTitle) {
    return { error: "Add a title first." };
  }

  const cleanDescription = readText(description) || null;
  const { supabase, user } = await requireUser();

  const { data, error } = await supabase
    .from("event_ideas")
    .insert({
      title: cleanTitle,
      description: cleanDescription,
      created_by: user.id,
      status: "open",
    })
    .select("id,title,description,status,event_id,created_at")
    .single();

  if (error || !data) {
    return { error: "Couldn't save that idea. Try again." };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name,username")
    .eq("id", user.id)
    .maybeSingle();

  const authName =
    typeof user.user_metadata?.display_name === "string"
      ? user.user_metadata.display_name.trim()
      : "";
  const creatorName =
    profile?.display_name?.trim() ||
    profile?.username?.trim() ||
    authName ||
    user.email?.split("@")[0] ||
    "You";

  revalidateIdeaPaths();

  return {
    idea: {
      id: data.id,
      title: data.title,
      description: data.description,
      creatorName,
      status: data.status as IdeaStatus,
      eventId: data.event_id,
      createdAt: data.created_at,
      voteCount: 0,
      hasVoted: false,
      isCreator: true,
    },
  };
}

export async function updateIdeaAction(
  ideaId: string,
  title: string,
  description: string
): Promise<UpdateIdeaResult> {
  const cleanTitle = readText(title);

  if (!cleanTitle) {
    return { error: "Add a title first." };
  }

  const id = readText(ideaId);

  if (!id) {
    return { error: "Couldn't find that idea. Try again." };
  }

  const cleanDescription = readText(description) || null;
  const { supabase, user } = await requireUser();
  const { data, error } = await supabase
    .from("event_ideas")
    .update({
      title: cleanTitle,
      description: cleanDescription,
    })
    .eq("id", id)
    .eq("created_by", user.id)
    .select("id,title,description")
    .maybeSingle();

  if (error) {
    return { error: "Couldn't save those changes. Try again." };
  }

  if (!data) {
    return { error: "This idea isn't yours to edit." };
  }

  revalidateIdeaPaths();

  return {
    title: data.title,
    description: data.description,
  };
}

export async function dropIdeaAction(
  ideaId: string
): Promise<IdeaMutationResult> {
  const id = readText(ideaId);

  if (!id) {
    return { error: "Couldn't find that idea. Try again." };
  }

  const { supabase, user } = await requireUser();
  const { data, error } = await supabase
    .from("event_ideas")
    .update({ status: "dropped" })
    .eq("id", id)
    .eq("created_by", user.id)
    .select("id")
    .maybeSingle();

  if (error) {
    return { error: "Couldn't drop that idea. Try again." };
  }

  if (!data) {
    return { error: "This idea isn't yours to drop." };
  }

  revalidateIdeaPaths();
  return { dropped: true };
}

export async function deleteIdeaAction(
  ideaId: string
): Promise<IdeaMutationResult> {
  const id = readText(ideaId);

  if (!id) {
    return { error: "Couldn't find that idea. Try again." };
  }

  const { supabase, user } = await requireUser();
  const { data, error } = await supabase
    .from("event_ideas")
    .delete()
    .eq("id", id)
    .eq("created_by", user.id)
    .select("id");

  if (error) {
    return { error: "Couldn't delete that idea. Try again." };
  }

  if (!data || data.length === 0) {
    return { error: "This idea isn't yours to delete." };
  }

  revalidateIdeaPaths();
  return { deleted: true };
}

export async function toggleIdeaVoteAction(
  ideaId: string
): Promise<IdeaVoteResult> {
  const id = readText(ideaId);

  if (!id) {
    return { error: "Couldn't find that idea. Try again." };
  }

  const { supabase, user } = await requireUser();

  const { data: idea, error: ideaError } = await supabase
    .from("event_ideas")
    .select("id,status")
    .eq("id", id)
    .maybeSingle();

  if (ideaError || !idea) {
    return { error: "Couldn't find that idea. Try again." };
  }

  if (idea.status !== "open") {
    return { error: "That idea isn't open for votes." };
  }

  const { data: existingVote, error: voteError } = await supabase
    .from("idea_votes")
    .select("idea_id")
    .eq("idea_id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (voteError) {
    return { error: "Couldn't save your vote. Try again." };
  }

  if (existingVote) {
    const { error } = await supabase
      .from("idea_votes")
      .delete()
      .eq("idea_id", id)
      .eq("user_id", user.id);

    if (error) {
      return { error: "Couldn't save your vote. Try again." };
    }

    revalidateIdeaPaths();
    return { voted: false };
  }

  const { error } = await supabase.from("idea_votes").insert({
    idea_id: id,
    user_id: user.id,
  });

  if (error) {
    return { error: "Couldn't save your vote. Try again." };
  }

  revalidateIdeaPaths();
  return { voted: true };
}
