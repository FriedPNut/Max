"use server";

import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import type { ListKind } from "@/lib/lists";

export type InfoListRow = {
  id: string;
  title: string;
  kind: ListKind;
  openCount: number;
  creatorName: string;
};

export type InfoListsResult = { rows: InfoListRow[]; error?: string };

export async function loadInfoListsAction(): Promise<InfoListsResult> {
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

  const { data: listData, error: listError } = await supabase
    .from("lists")
    .select("id,title,kind,created_by")
    .order("created_at", { ascending: false })
    .limit(100);

  if (listError) {
    return { rows: [], error: "Couldn't load lists." };
  }

  const lists = (listData ?? []) as {
    id: string;
    title: string;
    kind: ListKind;
    created_by: string;
  }[];
  const listIds = lists.map((list) => list.id);
  const creatorIds = [...new Set(lists.map((list) => list.created_by))];

  const [itemResult, profileResult] = await Promise.all([
    listIds.length > 0
      ? supabase.from("list_items").select("list_id").in("list_id", listIds).eq("done", false)
      : Promise.resolve({ data: [], error: null }),
    creatorIds.length > 0
      ? supabase.from("profiles").select("id,display_name,username").in("id", creatorIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  const openCounts = new Map<string, number>();

  for (const row of (itemResult.data ?? []) as { list_id: string }[]) {
    openCounts.set(row.list_id, (openCounts.get(row.list_id) ?? 0) + 1);
  }

  const nameById = new Map<string, string>();

  for (const profile of (profileResult.data ?? []) as {
    id: string;
    display_name: string | null;
    username: string | null;
  }[]) {
    nameById.set(profile.id, profile.display_name?.trim() || profile.username?.trim() || "A friend");
  }

  if (!nameById.has(user.id)) {
    nameById.set(user.id, "You");
  }

  return {
    rows: lists.map((list) => ({
      id: list.id,
      title: list.title,
      kind: list.kind,
      openCount: openCounts.get(list.id) ?? 0,
      creatorName: list.created_by === user.id ? "you" : nameById.get(list.created_by) ?? "A friend",
    })),
  };
}
