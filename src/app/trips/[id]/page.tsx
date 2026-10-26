import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { AppShell, getAuthenticatedUser } from "@/components/app-shell";
import { TripPeople } from "@/components/trips/trip-people";
import { ItineraryPanel, LinksPanel, PackingPanel } from "@/components/trips/trip-tab-panels";
import { createClient } from "@/lib/supabase/server";
import { nameInitial } from "@/lib/chat";
import { countdownLabel, parseDateKey, tripDays, TRIP_TABS, type TripRecord, type TripTab } from "@/lib/trips";

export default async function TripPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { id } = await params;
  const { tab } = await searchParams;
  const activeTab: TripTab = (TRIP_TABS as readonly string[]).includes(tab ?? "")
    ? (tab as TripTab)
    : "overview";
  const { user } = await getAuthenticatedUser();
  const supabase = await createClient();

  const { data: membership } = await supabase
    .from("trip_members")
    .select("trip_id")
    .eq("trip_id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership) {
    notFound();
  }

  const { data: trip } = await supabase
    .from("trips")
    .select("id,title,destination,start_date,end_date,description,cover_path,created_by")
    .eq("id", id)
    .maybeSingle();

  if (!trip) {
    notFound();
  }

  const record = trip as TripRecord;
  const { data: memberRows } = await supabase
    .from("trip_members")
    .select("user_id")
    .eq("trip_id", id);
  const memberIds = [...new Set(((memberRows ?? []) as { user_id: string }[]).map((row) => row.user_id))];
  const { data: profiles } = memberIds.length
    ? await supabase.from("profiles").select("id,display_name,username").in("id", memberIds)
    : { data: [] };
  const people = memberIds.map((memberId) => {
    const profile = ((profiles ?? []) as { id: string; display_name: string | null; username: string | null }[])
      .find((p) => p.id === memberId);
    const name = profile?.display_name?.trim() || profile?.username?.trim() || (memberId === user.id ? "Me" : "A friend");
    return { id: memberId, name, initial: nameInitial(name) };
  });

  const { data: friendshipRows } = await supabase
    .from("friendships")
    .select("requester_id,addressee_id")
    .eq("status", "accepted")
    .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`);
  const friendIds = [
    ...new Set(
      ((friendshipRows ?? []) as { requester_id: string; addressee_id: string }[]).map((row) =>
        row.requester_id === user.id ? row.addressee_id : row.requester_id
      )
    ),
  ].filter((friendId) => !memberIds.includes(friendId));
  const { data: friendProfiles } = friendIds.length
    ? await supabase.from("profiles").select("id,display_name,username").in("id", friendIds)
    : { data: [] };
  const addable = ((friendProfiles ?? []) as { id: string; display_name: string | null; username: string | null }[])
    .map((p) => ({ id: p.id, name: p.display_name?.trim() || p.username?.trim() || "A friend" }));

  let tabContent = null;

  if (activeTab === "itinerary") {
    const { data } = await supabase.from("trip_itinerary_items").select("id,day,title,time_label").eq("trip_id", id).order("day").order("created_at");
    tabContent = <ItineraryPanel tripId={id} items={(data ?? []) as { id: string; day: string; title: string; time_label: string | null }[]} days={tripDays(record.start_date, record.end_date)} />;
  } else if (activeTab === "packing") {
    const { data } = await supabase.from("trip_packing_items").select("id,label,packed").eq("trip_id", id).order("created_at");
    tabContent = <PackingPanel tripId={id} items={(data ?? []) as { id: string; label: string; packed: boolean }[]} />;
  } else if (activeTab === "links") {
    const { data } = await supabase.from("trip_links").select("id,kind,title,url").eq("trip_id", id).order("created_at");
    tabContent = <LinksPanel tripId={id} links={(data ?? []) as { id: string; kind: "lodging" | "transport" | "activity" | "other"; title: string; url: string }[]} />;
  }

  const countdown = countdownLabel(record.start_date, record.end_date);
  const isCreator = record.created_by === user.id;

  return (
    <AppShell userId={user.id}>
      <section className="space-y-6">
        <Link href="/trips" className="inline-flex min-h-11 items-center gap-1.5 text-sm text-muted hover:text-text transition-colors duration-200 ease-out">
          <ArrowLeft size={24} strokeWidth={1.75} aria-hidden="true" />
          Trips
        </Link>

        <div>
          <h1 className="text-[22px] font-bold leading-tight text-text">{record.title}</h1>
          <p className="mt-2 text-sm text-muted">
            {record.destination ? `${record.destination} · ` : ""}
            {formatRange(record.start_date, record.end_date)}
            {countdown ? ` · ${countdown}` : ""}
          </p>
        </div>

        <nav aria-label="Trip sections" className="-mx-4 flex gap-1 overflow-x-auto border-b border-line px-4" data-no-swipe>
          {TRIP_TABS.map((name) => (
            <Link
              key={name}
              href={`/trips/${id}?tab=${name}`}
              aria-current={activeTab === name ? "page" : undefined}
              className={`min-h-11 shrink-0 border-b px-3 py-3 text-sm capitalize ${activeTab === name ? "border-text font-semibold text-text" : "border-transparent text-muted hover:text-text"}`}
            >
              {name}
            </Link>
          ))}
        </nav>

        {activeTab === "overview" && (
          <div className="space-y-4">
            {record.description ? <p className="whitespace-pre-line text-base text-text">{record.description}</p> : <p className="text-sm text-muted">No description yet.</p>}
          </div>
        )}

        {activeTab === "people" && (
          <TripPeople tripId={id} people={people} addable={addable} isCreator={isCreator} currentUserId={user.id} />
        )}

        {tabContent}

        {activeTab === "costs" && (
          <p className="text-sm text-muted">Costs is coming next.</p>
        )}
      </section>
    </AppShell>
  );
}

function formatRange(start: string, end: string) {
  const s = parseDateKey(start);
  const e = parseDateKey(end);

  if (!s || !e) {
    return "";
  }

  const fmt = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" });
  return start === end ? fmt.format(s) : `${fmt.format(s)} – ${fmt.format(e)}`;
}
