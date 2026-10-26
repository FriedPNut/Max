import { AppShell, getAuthenticatedUser } from "@/components/app-shell";
import { ListsView, type ListRow } from "@/components/lists/lists-view";
import { createClient } from "@/lib/supabase/server";
import { LIST_KINDS, type ListKind } from "@/lib/lists";

export default async function ListsPage() {
  const { user, displayName } = await getAuthenticatedUser();
  const supabase = await createClient();

  const { data: listData, error: listError } = await supabase
    .from("lists")
    .select("id,title,kind,created_by")
    .order("created_at", { ascending: false })
    .limit(100);

  const lists = (listData ?? []) as {
    id: string;
    title: string;
    kind: ListKind;
    created_by: string;
  }[];
  const listIds = lists.map((list) => list.id);
  const creatorIds = [...new Set(lists.map((list) => list.created_by))];

  // Open-item counts and creator names both only need the list rows above.
  const [itemResult, profileResult] = await Promise.all([
    listIds.length > 0
      ? supabase
          .from("list_items")
          .select("list_id")
          .in("list_id", listIds)
          .eq("done", false)
      : Promise.resolve({ data: [], error: null }),
    creatorIds.length > 0
      ? supabase.from("profiles").select("id,display_name,username").in("id", creatorIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  const openCounts = new Map<string, number>();

  for (const row of (itemResult.data ?? []) as { list_id: string }[]) {
    openCounts.set(row.list_id, (openCounts.get(row.list_id) ?? 0) + 1);
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

  const rows: ListRow[] = lists.map((list) => ({
    id: list.id,
    title: list.title,
    kind: list.kind,
    openCount: openCounts.get(list.id) ?? 0,
    creatorName: nameById.get(list.created_by) ?? "A friend",
  }));

  return (
    <AppShell userId={user.id}>
      <section className="space-y-8">
        <h1 className="text-[22px] font-bold leading-tight text-text">
          Lists
        </h1>

        {listError ? (
          <p className="text-sm text-muted">
            Couldn&apos;t load lists. Refresh and try again.
          </p>
        ) : (
          <ListsView rows={rows} kinds={[...LIST_KINDS]} />
        )}
      </section>
    </AppShell>
  );
}
