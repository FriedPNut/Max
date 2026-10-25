"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { loadEventCosts } from "@/lib/event-costs-data";
import { parseDollarsToCents, type EventCostsActionResult, type ExpenseInput } from "@/lib/event-costs";

async function requireUser() {
  if (!isSupabaseConfigured()) redirect("/login");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const displayName =
    (typeof user.user_metadata?.display_name === "string" && user.user_metadata.display_name.trim()) ||
    user.email?.split("@")[0] || "friend";
  return { supabase, user, displayName };
}

function clean(value: unknown) {
  return String(value ?? "").trim();
}

async function resultFor(supabase: Awaited<ReturnType<typeof createClient>>, eventId: string, userId: string, name: string): Promise<EventCostsActionResult> {
  const snapshot = await loadEventCosts(supabase, { kind: "event", id: eventId }, userId, name);
  return snapshot.error ? { error: snapshot.error } : { snapshot };
}

function revalidateEvent(eventId: string) {
  revalidatePath(`/events/${eventId}`);
  revalidatePath("/events");
}

function parseExpense(input: ExpenseInput) {
  const description = clean(input?.description);
  const amountCents = parseDollarsToCents(clean(input?.amount));
  const paidBy = clean(input?.paidBy);
  const participantIds = [...new Set((input?.participantIds ?? []).map(clean).filter(Boolean))];

  if (!description || description.length > 120) return { error: "Add a short description." } as const;
  if (amountCents === null) return { error: "Enter an amount with up to two decimal places." } as const;
  if (!paidBy) return { error: "Choose who paid." } as const;
  if (participantIds.length === 0) return { error: "Choose at least one person to split with." } as const;
  return { description, amountCents, paidBy, participantIds } as const;
}

export async function saveEventExpenseAction(eventId: string, input: ExpenseInput, expenseId?: string): Promise<EventCostsActionResult> {
  const id = clean(eventId);
  const parsed = parseExpense(input);
  if (!id) return { error: "Couldn't find that event. Refresh and try again." };
  if ("error" in parsed) return parsed;

  const { supabase, user, displayName } = await requireUser();
  const { data: event, error: eventError } = await supabase.from("events").select("id").eq("id", id).maybeSingle();
  if (eventError || !event) return { error: "Couldn't find that event. Refresh and try again." };
  const { data: profiles, error: profileError } = await supabase.from("profiles").select("id").in("id", [...new Set([parsed.paidBy, ...parsed.participantIds])]);
  if (profileError || new Set((profiles ?? []).map((profile: { id: string }) => profile.id)).size !== new Set([parsed.paidBy, ...parsed.participantIds]).size) {
    return { error: "Choose people from the list." };
  }

  if (expenseId) {
    const { data: existing, error } = await supabase.from("expenses").select("id,event_id,paid_by").eq("id", clean(expenseId)).eq("event_id", id).maybeSingle();
    if (error || !existing) return { error: "Couldn't find that expense." };
    if (existing.paid_by !== user.id) return { error: "You can only edit expenses you paid." };
    const { data, error: updateError } = await supabase.from("expenses").update({ paid_by: parsed.paidBy, description: parsed.description, amount_cents: parsed.amountCents }).eq("id", clean(expenseId)).eq("event_id", id).select("id");
    if (updateError || !data?.length) return { error: "Couldn't save that expense. Try again." };
    const { error: clearError } = await supabase.from("expense_participants").delete().eq("expense_id", clean(expenseId));
    if (clearError) return { error: "Expense saved, but couldn't update the split. Refresh and try again." };
    const { error: participantsError } = await supabase.from("expense_participants").insert(parsed.participantIds.map((user_id) => ({ expense_id: clean(expenseId), user_id })));
    if (participantsError) return { error: "Expense saved, but couldn't update the split. Refresh and try again." };
  } else {
    const { data: expense, error } = await supabase.from("expenses").insert({ event_id: id, paid_by: parsed.paidBy, description: parsed.description, amount_cents: parsed.amountCents }).select("id").single();
    if (error || !expense) return { error: "Couldn't add that expense. Try again." };
    const { error: participantsError } = await supabase.from("expense_participants").insert(parsed.participantIds.map((user_id) => ({ expense_id: expense.id, user_id })));
    if (participantsError) {
      await supabase.from("expenses").delete().eq("id", expense.id).eq("event_id", id);
      return { error: "Couldn't save the split. Try again." };
    }
  }

  revalidateEvent(id);
  return resultFor(supabase, id, user.id, displayName);
}

export async function deleteEventExpenseAction(eventId: string, expenseId: string): Promise<EventCostsActionResult> {
  const id = clean(eventId);
  const expense = clean(expenseId);
  const { supabase, user, displayName } = await requireUser();
  const { data, error } = await supabase.from("expenses").delete().eq("id", expense).eq("event_id", id).eq("paid_by", user.id).select("id");
  if (error || !data?.length) return { error: "You can only delete expenses you paid." };
  revalidateEvent(id);
  return resultFor(supabase, id, user.id, displayName);
}

export async function markEventDebtPaidAction(eventId: string, fromUser: string, toUser: string, amountCents: number): Promise<EventCostsActionResult> {
  const id = clean(eventId);
  const from = clean(fromUser);
  const to = clean(toUser);
  const { supabase, user, displayName } = await requireUser();
  if (!Number.isSafeInteger(amountCents) || amountCents <= 0 || from === to || (user.id !== from && user.id !== to)) {
    return { error: "That payment can't be recorded." };
  }
  const snapshot = await loadEventCosts(supabase, { kind: "event", id }, user.id, displayName);
  const debt = snapshot.debts.find((item) => item.from.id === from && item.to.id === to && item.amountCents === amountCents);
  if (!debt) return { error: "That balance has changed. Refresh and try again." };
  const { error } = await supabase.from("settlements").insert({ event_id: id, from_user: from, to_user: to, amount_cents: amountCents });
  if (error) return { error: "Couldn't record that payment. Try again." };
  revalidateEvent(id);
  return resultFor(supabase, id, user.id, displayName);
}

export async function undoEventSettlementAction(eventId: string, settlementId: string): Promise<EventCostsActionResult> {
  const id = clean(eventId);
  const settlement = clean(settlementId);
  const { supabase, user, displayName } = await requireUser();
  const { data, error } = await supabase.from("settlements").delete().eq("id", settlement).eq("event_id", id).or(`from_user.eq.${user.id},to_user.eq.${user.id}`).select("id");
  if (error || !data?.length) return { error: "Only either person in this payment can undo it." };
  revalidateEvent(id);
  return resultFor(supabase, id, user.id, displayName);
}
