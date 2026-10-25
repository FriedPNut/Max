import type { createClient } from "@/lib/supabase/server";
import {
  calculateEventDebts,
  type CostPerson,
  type CostScope,
  type EventCostsSnapshot,
  type EventExpense,
  type EventSettlement,
} from "@/lib/event-costs";

type ServerClient = Awaited<ReturnType<typeof createClient>>;

type ProfileRow = {
  id: string;
  display_name: string | null;
  username: string | null;
};
type ExpenseRow = {
  id: string;
  event_id: string;
  paid_by: string;
  description: string;
  amount_cents: number;
};
type ParticipantRow = { expense_id: string; user_id: string };
type SettlementRow = {
  id: string;
  event_id: string;
  from_user: string;
  to_user: string;
  amount_cents: number;
};
type RsvpRow = { user_id: string; status: string };

export async function loadEventCosts(
  supabase: ServerClient,
  scope: CostScope,
  currentUserId: string,
  currentUserName: string
): Promise<EventCostsSnapshot> {
  const scopeColumn = scope.kind === "event" ? "event_id" : "trip_id";
  // Trips have no RSVPs, so everyone who is a trip member counts as going.
  const attendeeQuery =
    scope.kind === "event"
      ? supabase.from("rsvps").select("user_id,status").eq("event_id", scope.id)
      : supabase.from("trip_members").select("user_id").eq("trip_id", scope.id);
  const [expenseResult, settlementResult, rsvpResult] = await Promise.all([
    supabase
      .from("expenses")
      .select("id,event_id,paid_by,description,amount_cents")
      .eq(scopeColumn, scope.id),
    supabase
      .from("settlements")
      .select("id,event_id,from_user,to_user,amount_cents")
      .eq(scopeColumn, scope.id),
    attendeeQuery,
  ]);

  if (
    expenseResult.error || settlementResult.error || rsvpResult.error
  ) {
    return {
      expenses: [],
      settlements: [],
      people: [],
      goingIds: [],
      debts: [],
      error: "Couldn't load event costs. Refresh and try again.",
    };
  }

  const expenseRows = (expenseResult.data ?? []) as ExpenseRow[];
  const settlementRows = (settlementResult.data ?? []) as SettlementRow[];
  const rsvpRows = ((rsvpResult.data ?? []) as RsvpRow[]).map((row) =>
    scope.kind === "event" ? row : { user_id: row.user_id, status: "going" }
  );
  const expenseIds = expenseRows.map((expense) => expense.id);
  let participantRows: ParticipantRow[] = [];

  if (expenseIds.length > 0) {
    const { data, error } = await supabase
      .from("expense_participants")
      .select("expense_id,user_id")
      .in("expense_id", expenseIds);

    if (error) {
      return {
        expenses: [],
        settlements: [],
        people: [],
        goingIds: [],
        debts: [],
        error: "Couldn't load event costs. Refresh and try again.",
      };
    }

    participantRows = (data ?? []) as ParticipantRow[];
  }

  const userIds = new Set<string>([currentUserId]);

  for (const row of rsvpRows) userIds.add(row.user_id);
  for (const row of expenseRows) userIds.add(row.paid_by);
  for (const row of participantRows) userIds.add(row.user_id);
  for (const row of settlementRows) {
    userIds.add(row.from_user);
    userIds.add(row.to_user);
  }

  const { data: profileData } = await supabase
    .from("profiles")
    .select("id,display_name,username")
    .in("id", [...userIds]);
  const profileRows = (profileData ?? []) as ProfileRow[];
  const profilesById = new Map(profileRows.map((profile) => [profile.id, profile]));

  function person(id: string): CostPerson {
    const profile = profilesById.get(id);
    return {
      id,
      name:
        profile?.display_name?.trim() ||
        profile?.username?.trim() ||
        (id === currentUserId ? currentUserName : "A friend"),
      username: profile?.username?.trim() || null,
    };
  }

  const people = [...userIds].map(person).sort((a, b) => a.name.localeCompare(b.name));
  const participantIdsByExpense = new Map<string, string[]>();

  for (const row of participantRows) {
    const ids = participantIdsByExpense.get(row.expense_id) ?? [];
    ids.push(row.user_id);
    participantIdsByExpense.set(row.expense_id, ids);
  }

  const expenses: EventExpense[] = expenseRows.map((row) => ({
    id: row.id,
    paidBy: person(row.paid_by),
    description: row.description,
    amountCents: Number(row.amount_cents),
    participantIds: participantIdsByExpense.get(row.id) ?? [],
    createdByMe: row.paid_by === currentUserId,
  }));
  const settlements: EventSettlement[] = settlementRows.map((row) => ({
    id: row.id,
    from: person(row.from_user),
    to: person(row.to_user),
    amountCents: Number(row.amount_cents),
  }));
  const goingIds = [
    ...new Set(rsvpRows.filter((row) => row.status === "going").map((row) => row.user_id)),
  ];

  return {
    expenses,
    settlements,
    people,
    goingIds,
    debts: calculateEventDebts(expenses, settlements, people),
  };
}
