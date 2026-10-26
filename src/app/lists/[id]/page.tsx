import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { AppShell, getAuthenticatedUser } from "@/components/app-shell";
import { ListDetailView, type DetailItem } from "@/components/lists/list-detail-view";
import { createClient } from "@/lib/supabase/server";
import type { ListItemRecord, ListKind, ListRecord } from "@/lib/lists";

export default async function ListDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { user, displayName } = await getAuthenticatedUser();
  const supabase = await createClient();

  const { data: listData } = await supabase
    .from("lists")
    .select("id,title,kind,created_by")
    .eq("id", id)
    .maybeSingle();

  const list = listData as ListRecord | null;

  if (!list) {
    notFound();
  }

  const { data: itemData, error: itemError } = await supabase
    .from("list_items")
    .select("id,list_id,title,note,url,added_by,done,done_at,done_by,event_idea_id,created_at")
    .eq("list_id", id)
    .order("created_at", { ascending: false })
    .limit(200);

  const items = (itemData ?? []) as ListItemRecord[];
  const itemIds = items.map((item) => item.id);
  const personIds = [
    ...new Set(
      items.flatMap((item) => [item.added_by, item.done_by].filter((value): value is string => Boolean(value)))
    ),
  ];

  // Votes and people both only need the items, so they load together.
  const [voteResult, profileResult] = await Promise.all([
    itemIds.length > 0
      ? supabase
          .from("list_item_votes")
          .select("item_id,user_id")
          .in("item_id", itemIds)
      : Promise.resolve({ data: [], error: null }),
    personIds.length > 0
      ? supabase
          .from("profiles")
          .select("id,display_name,username")
          .in("id", personIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  const voteCounts = new Map<string, number>();
  const votedByMe = new Set<string>();

  for (const vote of (voteResult.data ?? []) as { item_id: string; user_id: string }[]) {
    voteCounts.set(vote.item_id, (voteCounts.get(vote.item_id) ?? 0) + 1);

    if (vote.user_id === user.id) {
      votedByMe.add(vote.item_id);
    }
  }

  const nameById = new Map<string, string>([[user.id, displayName]]);

  for (const profile of (profileResult.data ?? []) as {
    id: string;
    display_name: string | null;
    username: string | null;
  }[]) {
    nameById.set(
      profile.id,
      profile.display_name?.trim() || profile.username?.trim() || "A friend"
    );
  }

  const detailItems: DetailItem[] = items.map((item) => ({
    id: item.id,
    title: item.title,
    note: item.note,
    url: item.url,
    addedByName: nameById.get(item.added_by) ?? "A friend",
    addedByMe: item.added_by === user.id,
    done: item.done,
    doneByName: item.done_by ? nameById.get(item.done_by) ?? "A friend" : null,
    voteCount: voteCounts.get(item.id) ?? 0,
    votedByMe: votedByMe.has(item.id),
    eventIdeaId: item.event_idea_id,
    createdAt: item.created_at,
  }));

  return (
    <AppShell userId={user.id}>
      <section className="space-y-8">
        <div>
          <Link
            href="/lists"
            className="mb-6 inline-flex min-h-11 items-center gap-1.5 text-sm text-muted transition-colors duration-200 ease-out hover:text-text"
          >
            <ArrowLeft size={24} strokeWidth={1.75} aria-hidden="true" />
            Lists
          </Link>
          <h1 className="text-[22px] font-bold leading-tight text-text break-words">
            {list.title}
          </h1>
        </div>

        {itemError ? (
          <p className="text-sm text-muted">
            Couldn&apos;t load items. Refresh and try again.
          </p>
        ) : (
          <ListDetailView
            listId={list.id}
            listTitle={list.title}
            listKind={list.kind as ListKind}
            isCreator={list.created_by === user.id}
            initialItems={detailItems}
          />
        )}
      </section>
    </AppShell>
  );
}
