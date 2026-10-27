"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { loadIdeaCards } from "@/lib/events-data";
import { openDmWith } from "@/lib/dm";
import {
  IDEA_SHARE_MAX_CHATS,
  shareNote,
  shareToast,
  uniqueIdeaIds,
  type IdeaCard,
} from "@/lib/ideas";
import {
  nameInitial,
  profileName,
  type ChatProfile,
} from "@/lib/chat";
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

export type IdeaCardsResult = {
  error?: string;
  cards?: IdeaCard[];
  /** Ideas that no longer exist, so their card can say they were removed. */
  missingIds?: string[];
};

export type IdeaStatusResult = {
  error?: string;
  removed?: boolean;
  status?: IdeaStatus;
  eventId?: string | null;
};

export type IdeaShareTarget = {
  /** Stable row key: "c:<conversation>" or "f:<friend>". */
  key: string;
  name: string;
  initial: string;
  isGroup: boolean;
  conversationId: string | null;
  friendId: string | null;
};

export type IdeaShareTargetsResult = {
  error?: string;
  conversations?: IdeaShareTarget[];
  friends?: IdeaShareTarget[];
};

export type SendIdeaResult = {
  error?: string;
  sent?: number;
  message?: string;
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
  description: string,
  id?: string
): Promise<CreateIdeaResult> {
  const cleanTitle = readText(title);

  if (!cleanTitle) {
    return { error: "Add a title first." };
  }

  const cleanDescription = readText(description) || null;
  const { supabase, user } = await requireUser();
  // A client-generated id lets the idea show up before this insert finishes.
  const ideaId =
    typeof id === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
      ? id
      : undefined;

  const { data, error } = await supabase
    .from("event_ideas")
    .insert({
      ...(ideaId ? { id: ideaId } : {}),
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

/** Fresh cards for the ideas shared in a conversation. */
export async function loadIdeaCardsAction(
  ideaIds: string[]
): Promise<IdeaCardsResult> {
  const ids = uniqueIdeaIds(ideaIds);

  if (ids.length === 0) {
    return { cards: [], missingIds: [] };
  }

  const { supabase } = await requireUser();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Couldn't load that idea. Refresh and try again." };
  }

  const result = await loadIdeaCards(supabase, user.id, ids);

  return {
    cards: result.cards,
    missingIds: result.missingIds,
    ...(result.error ? { error: result.error } : {}),
  };
}

/**
 * The pre-check behind "Make it an event": the idea is re-read right before the
 * form opens, so someone who scheduled it a second earlier is never overridden
 * silently.
 */
export async function checkIdeaStatusAction(
  ideaId: string
): Promise<IdeaStatusResult> {
  const id = readText(ideaId);

  if (!uniqueIdeaIds([id]).length) {
    return { error: "Couldn't find that idea. Try again." };
  }

  const { supabase } = await requireUser();
  const { data, error } = await supabase
    .from("event_ideas")
    .select("id,status,event_id")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    return { error: "Couldn't check that idea. Try again." };
  }

  if (!data) {
    return { removed: true };
  }

  return {
    status: data.status as IdeaStatus,
    eventId: (data.event_id as string | null) ?? null,
  };
}

/**
 * Chats I can share into: my conversations first, then friends I could start a
 * DM with. Friends who already have a DM are left out of the second list.
 */
export async function loadIdeaShareTargetsAction(): Promise<IdeaShareTargetsResult> {
  const { supabase, user } = await requireUser();

  const [membershipResult, friendshipResult] = await Promise.all([
    supabase
      .from("conversation_members")
      .select("conversation_id")
      .eq("user_id", user.id),
    supabase
      .from("friendships")
      .select("requester_id,addressee_id")
      .eq("status", "accepted")
      .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`),
  ]);

  if (membershipResult.error || friendshipResult.error) {
    return { error: "Couldn't load your chats. Try again." };
  }

  const conversationIds = (
    (membershipResult.data ?? []) as { conversation_id: string }[]
  ).map((row) => row.conversation_id);
  const friendIds = [
    ...new Set(
      ((friendshipResult.data ?? []) as {
        requester_id: string;
        addressee_id: string;
      }[]).map((row) =>
        row.requester_id === user.id ? row.addressee_id : row.requester_id
      )
    ),
  ];
  const dmPartnerIds = new Set<string>();
  let conversations: IdeaShareTarget[] = [];

  if (conversationIds.length > 0) {
    const [conversationResult, memberResult] = await Promise.all([
      supabase
        .from("conversations")
        .select("id,name,is_group,created_at")
        .in("id", conversationIds)
        .order("created_at", { ascending: false }),
      supabase
        .from("conversation_members")
        .select("conversation_id,user_id")
        .in("conversation_id", conversationIds),
    ]);

    if (conversationResult.error || memberResult.error) {
      return { error: "Couldn't load your chats. Try again." };
    }

    const members = (memberResult.data ?? []) as {
      conversation_id: string;
      user_id: string;
    }[];
    const otherIds = [
      ...new Set(
        members
          .map((member) => member.user_id)
          .filter((id) => id !== user.id)
      ),
    ];
    let profiles: ChatProfile[] = [];

    if (otherIds.length > 0) {
      const { data } = await supabase
        .from("profiles")
        .select("id,display_name,username")
        .in("id", otherIds);

      profiles = (data ?? []) as ChatProfile[];
    }

    const profilesById = new Map(
      profiles.map((profile) => [profile.id, profile])
    );
    const otherByConversation = new Map<string, string>();

    for (const member of members) {
      if (member.user_id !== user.id) {
        otherByConversation.set(member.conversation_id, member.user_id);
      }
    }

    conversations = (
      (conversationResult.data ?? []) as {
        id: string;
        name: string | null;
        is_group: boolean;
      }[]
    ).map((conversation) => {
      const otherId = otherByConversation.get(conversation.id) ?? null;

      if (!conversation.is_group && otherId) {
        dmPartnerIds.add(otherId);
      }

      const name = conversation.is_group
        ? conversation.name?.trim() || "Group chat"
        : profileName(profilesById.get(otherId ?? ""));

      return {
        key: `c:${conversation.id}`,
        name,
        initial: nameInitial(name),
        isGroup: conversation.is_group,
        conversationId: conversation.id,
        friendId: null,
      };
    });
  }

  const shareableFriends = friendIds.filter((id) => !dmPartnerIds.has(id));
  let friendTargets: IdeaShareTarget[] = [];

  if (shareableFriends.length > 0) {
    const { data, error } = await supabase
      .from("profiles")
      .select("id,display_name,username")
      .in("id", shareableFriends);

    if (error) {
      return { error: "Couldn't load your friends. Try again." };
    }

    const profiles = (data ?? []) as ChatProfile[];
    const profilesById = new Map(
      profiles.map((profile) => [profile.id, profile])
    );

    friendTargets = shareableFriends
      .map((friendId) => {
        const name = profileName(profilesById.get(friendId));

        return {
          key: `f:${friendId}`,
          name,
          initial: nameInitial(name),
          isGroup: false,
          conversationId: null,
          friendId,
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  return { conversations, friends: friendTargets };
}

/**
 * One message per chat, with idea_id set and the optional note as the body, so
 * unread counts, chat previews, search and notifications all treat it like any
 * other message.
 */
export async function sendIdeaToChatsAction(input: {
  ideaId: string;
  conversationIds?: string[];
  friendIds?: string[];
  note?: string;
}): Promise<SendIdeaResult> {
  const ideaId = readText(input?.ideaId);

  if (!uniqueIdeaIds([ideaId]).length) {
    return { error: "Couldn't find that idea. Try again." };
  }

  const { supabase, user } = await requireUser();
  const { data: idea, error: ideaError } = await supabase
    .from("event_ideas")
    .select("id")
    .eq("id", ideaId)
    .maybeSingle();

  if (ideaError) {
    return { error: "Couldn't share that idea. Try again." };
  }

  if (!idea) {
    return { error: "This idea was removed." };
  }

  const wantedConversations = uniqueIdeaIds(input?.conversationIds ?? []);
  const wantedFriends = uniqueIdeaIds(input?.friendIds ?? []);

  if (wantedConversations.length === 0 && wantedFriends.length === 0) {
    return { error: "Pick at least one chat." };
  }

  const targets = new Set<string>();

  if (wantedConversations.length > 0) {
    const { data, error } = await supabase
      .from("conversation_members")
      .select("conversation_id")
      .eq("user_id", user.id)
      .in("conversation_id", wantedConversations);

    if (error) {
      return { error: "Couldn't share that idea. Try again." };
    }

    for (const row of (data ?? []) as { conversation_id: string }[]) {
      targets.add(row.conversation_id);
    }
  }

  if (wantedFriends.length > 0) {
    const { data, error } = await supabase
      .from("friendships")
      .select("requester_id,addressee_id")
      .eq("status", "accepted")
      .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`);

    if (error) {
      return { error: "Couldn't share that idea. Try again." };
    }

    const friends = new Set(
      ((data ?? []) as { requester_id: string; addressee_id: string }[]).map(
        (row) =>
          row.requester_id === user.id ? row.addressee_id : row.requester_id
      )
    );

    for (const friendId of wantedFriends) {
      if (!friends.has(friendId)) {
        continue;
      }

      const dm = await openDmWith(supabase, user.id, friendId);

      if ("error" in dm) {
        return { error: dm.error };
      }

      targets.add(dm.id);
    }
  }

  const conversationIds = [...targets].slice(0, IDEA_SHARE_MAX_CHATS);

  if (conversationIds.length === 0) {
    return { error: "Pick at least one chat." };
  }

  const body = shareNote(input?.note);
  const { data, error } = await supabase
    .from("messages")
    .insert(
      conversationIds.map((conversationId) => ({
        conversation_id: conversationId,
        user_id: user.id,
        body,
        idea_id: ideaId,
      }))
    )
    .select("id");

  if (error || !data) {
    return { error: "Couldn't share that idea. Try again." };
  }

  revalidatePath("/chat");

  for (const conversationId of conversationIds) {
    revalidatePath(`/chat/${conversationId}`);
  }

  return { sent: data.length, message: shareToast(data.length) };
}
