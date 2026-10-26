"use client";

import { Plus } from "lucide-react";
import { useState } from "react";
import {
  deleteEventExpenseAction,
  markEventDebtPaidAction,
  saveEventExpenseAction,
  undoEventSettlementAction,
} from "@/app/actions/event-costs";
import { PersonName } from "@/components/events/person-name";
import { Button, Card, Input, inputClass } from "@/components/ui";
import {
  formatCents,
  splitCents,
  type CostPerson,
  type EventCostsActionResult,
  type EventCostsSnapshot,
  type EventExpense,
  type ExpenseInput,
} from "@/lib/event-costs";

const labelClass = "mb-2 block text-sm text-muted";

type FormMode = { type: "create" } | { type: "edit"; expense: EventExpense } | null;

export function CostsTab({
  eventId,
  currentUserId,
  initialSnapshot,
}: {
  eventId: string;
  currentUserId: string;
  initialSnapshot: EventCostsSnapshot;
}) {
  const [snapshot, setSnapshot] = useState(initialSnapshot);
  const [form, setForm] = useState<FormMode>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  async function run(action: () => Promise<EventCostsActionResult>) {
    if (pending) return;
    setPending(true);
    setError(null);
    try {
      const result = await action();
      if (result.snapshot) setSnapshot(result.snapshot);
      if (result.error) {
        setError(result.error);
        return false;
      }
      return true;
    } catch {
      setError("Couldn't update costs. Try again.");
      return false;
    } finally {
      setPending(false);
    }
  }

  async function save(input: ExpenseInput, expenseId?: string) {
    if (await run(() => saveEventExpenseAction(eventId, input, expenseId))) {
      setForm(null);
      setConfirmDeleteId(null);
    }
  }

  return (
    <section className="space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-text">Costs</h2>
          <p className="mt-1 text-sm text-muted">Max tracks who owes whom but doesn&apos;t move money.</p>
        </div>
        {!form && <Button variant="secondary" onClick={() => { setError(null); setForm({ type: "create" }); }}><Plus size={24} strokeWidth={1.75} aria-hidden="true" />Add expense</Button>}
      </div>

      {snapshot.error && <p role="alert" className="text-sm text-text">{snapshot.error}</p>}
      {error && <p role="alert" className="text-sm text-text">{error}</p>}

      {form && <ExpenseForm
        key={form.type === "edit" ? form.expense.id : "new"}
        eventId={eventId}
        currentUserId={currentUserId}
        people={snapshot.people}
        goingIds={snapshot.goingIds}
        expense={form.type === "edit" ? form.expense : undefined}
        busy={pending}
        onSave={save}
        onCancel={() => { setForm(null); setError(null); }}
      />}

      <section className="space-y-3">
        <h3 className="text-lg font-semibold text-text">Who owes who</h3>
        {snapshot.debts.length === 0 ? <p className="text-sm text-muted">All settled up.</p> : (
          <ul className="border-t border-line">
            {[...snapshot.debts].sort((a, b) => {
              const aMine = a.from.id === currentUserId || a.to.id === currentUserId;
              const bMine = b.from.id === currentUserId || b.to.id === currentUserId;
              return Number(bMine) - Number(aMine);
            }).map((debt) => {
              const myDebt = debt.from.id === currentUserId || debt.to.id === currentUserId;
              return <li key={`${debt.from.id}:${debt.to.id}`} className={`flex flex-col gap-2 border-b border-line py-4 ${myDebt ? "font-semibold" : ""}`}>
                <p className={`text-base ${myDebt ? "text-text" : "text-muted"}`}>
                  {debt.from.id === currentUserId ? <>You owe <PersonName person={debt.to} currentUserId={currentUserId} /> {formatCents(debt.amountCents)}</> : debt.to.id === currentUserId ? <><PersonName person={debt.from} currentUserId={currentUserId} /> owes you {formatCents(debt.amountCents)}</> : <><PersonName person={debt.from} currentUserId={currentUserId} /> owes <PersonName person={debt.to} currentUserId={currentUserId} /> {formatCents(debt.amountCents)}</>}
                </p>
                {myDebt && <Button variant="secondary" size="sm" disabled={pending} onClick={() => void run(() => markEventDebtPaidAction(eventId, debt.from.id, debt.to.id, debt.amountCents))} className="self-start">{pending ? "Saving..." : "Mark as paid"}</Button>}
              </li>;
            })}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <h3 className="text-lg font-semibold text-text">Expenses</h3>
        {snapshot.expenses.length === 0 ? <p className="text-sm text-muted">No expenses yet.</p> : (
          <ul className="border-t border-line">
            {snapshot.expenses.map((expense) => <li key={expense.id} className="border-b border-line py-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="break-words text-base font-semibold text-text">{expense.description}</p>
                  <p className="mt-1 text-sm text-muted">Paid by <PersonName person={expense.paidBy} currentUserId={currentUserId} /> · split {expense.participantIds.length} ways</p>
                </div>
                <p className="shrink-0 text-base text-text">{formatCents(expense.amountCents)}</p>
              </div>
              {expense.paidBy.id === currentUserId && <div className="mt-2 flex flex-wrap gap-2">
                <Button variant="secondary" size="sm" disabled={pending} onClick={() => { setError(null); setForm({ type: "edit", expense }); }}>Edit</Button>
                {confirmDeleteId === expense.id ? <><Button variant="destructive" size="sm" disabled={pending} onClick={() => void run(() => deleteEventExpenseAction(eventId, expense.id)).then((ok) => ok && setConfirmDeleteId(null))}>Delete</Button><Button variant="secondary" size="sm" disabled={pending} onClick={() => setConfirmDeleteId(null)}>Cancel</Button></> : <Button variant="destructive" size="sm" disabled={pending} onClick={() => setConfirmDeleteId(expense.id)}>Delete</Button>}
              </div>}
            </li>)}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <h3 className="text-lg font-semibold text-text">Payments</h3>
        {snapshot.settlements.length === 0 ? <p className="text-sm text-muted">No payments recorded.</p> : (
          <ul className="border-t border-line">
            {snapshot.settlements.map((settlement) => {
              const canUndo = settlement.from.id === currentUserId || settlement.to.id === currentUserId;
              return <li key={settlement.id} className="flex items-center justify-between gap-3 border-b border-line py-3">
                <p className="min-w-0 text-sm text-text"><PersonName person={settlement.from} currentUserId={currentUserId} /> paid <PersonName person={settlement.to} currentUserId={currentUserId} /> {formatCents(settlement.amountCents)}</p>
                {canUndo && <Button variant="text" size="sm" disabled={pending} onClick={() => void run(() => undoEventSettlementAction(eventId, settlement.id))}>{pending ? "Undoing..." : "Undo"}</Button>}
              </li>;
            })}
          </ul>
        )}
      </section>
    </section>
  );
}

function ExpenseForm({
  eventId,
  currentUserId,
  people,
  goingIds,
  expense,
  busy,
  onSave,
  onCancel,
}: {
  eventId: string;
  currentUserId: string;
  people: CostPerson[];
  goingIds: string[];
  expense?: EventExpense;
  busy: boolean;
  onSave: (input: ExpenseInput, expenseId?: string) => void;
  onCancel: () => void;
}) {
  const [description, setDescription] = useState(expense?.description ?? "");
  const [amount, setAmount] = useState(expense ? `${Math.floor(expense.amountCents / 100)}.${String(expense.amountCents % 100).padStart(2, "0")}` : "");
  const [paidBy, setPaidBy] = useState(expense?.paidBy.id ?? currentUserId);
  const [participantIds, setParticipantIds] = useState(expense?.participantIds ?? goingIds);
  const [search, setSearch] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const filteredPeople = search.trim()
    ? people
        .filter((person) => `${person.name} ${person.username ?? ""}`.toLocaleLowerCase().includes(search.toLocaleLowerCase()))
        .slice(0, 30)
    : people.filter((person) => participantIds.includes(person.id));

  function toggleParticipant(userId: string) {
    setParticipantIds((current) => current.includes(userId) ? current.filter((id) => id !== userId) : [...current, userId]);
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!description.trim()) { setFormError("Add a description."); return; }
    if (!/^\d+(?:\.\d{1,2})?$/.test(amount.trim())) { setFormError("Enter an amount with up to two decimal places."); return; }
    if (participantIds.length === 0) { setFormError("Choose at least one person to split with."); return; }
    setFormError(null);
    onSave({ description, amount, paidBy, participantIds }, expense?.id);
  }

  let sharePreview = "";
  const centsMatch = /^(0|[1-9]\d*)(?:\.(\d{1,2}))?$/.exec(amount.trim());
  if (centsMatch && participantIds.length > 0) {
    const cents = Number(`${centsMatch[1]}${(centsMatch[2] ?? "").padEnd(2, "0")}`);
    if (Number.isSafeInteger(cents) && cents > 0) {
      const shares = splitCents(cents, participantIds);
      const values = [...shares.values()];
      sharePreview = `Each share is ${formatCents(values[0])}${values.some((value) => value !== values[0]) ? " or " + formatCents(values[values.length - 1]) : ""}.`;
    }
  }

  return <Card>
  <form onSubmit={handleSubmit} noValidate className="space-y-4 p-4">
    <h3 className="text-lg font-semibold text-text">{expense ? "Edit expense" : "Add expense"}</h3>
    <div><label htmlFor="expense-description" className={labelClass}>Description</label><Input id="expense-description" value={description} onChange={(event) => setDescription(event.target.value)} maxLength={120} disabled={busy} placeholder="Groceries" /></div>
    <div><label htmlFor="expense-amount" className={labelClass}>Amount in dollars</label><Input id="expense-amount" inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} disabled={busy} placeholder="24.50" /></div>
    <div><label htmlFor="expense-payer" className={labelClass}>Paid by</label><select id="expense-payer" value={paidBy} onChange={(event) => setPaidBy(event.target.value)} disabled={busy} className={inputClass}>{people.map((person) => <option key={person.id} value={person.id}>{person.id === currentUserId ? "Me" : person.name}</option>)}</select></div>
    <fieldset><legend className={labelClass}>Split between</legend><label className="mb-2 flex min-h-11 items-center gap-3 text-sm text-text"><input type="checkbox" checked={goingIds.length > 0 && goingIds.every((id) => participantIds.includes(id))} disabled={busy} onChange={() => setParticipantIds((current) => { const allGoing = goingIds.every((id) => current.includes(id)); return allGoing ? current.filter((id) => !goingIds.includes(id)) : [...new Set([...current, ...goingIds])]; })} className="h-4 w-4 accent-primary" />Everyone who&apos;s going</label><label htmlFor="cost-person-search" className={labelClass}>Add anyone else</label><Input id="cost-person-search" value={search} onChange={(event) => setSearch(event.target.value)} disabled={busy} placeholder="Search people" className="mb-2" /><div className="max-h-48 overflow-y-auto border-t border-line">{filteredPeople.map((person) => <label key={person.id} className="flex min-h-11 items-center gap-3 border-b border-line text-sm text-text"><input type="checkbox" checked={participantIds.includes(person.id)} onChange={() => toggleParticipant(person.id)} disabled={busy} className="h-4 w-4 accent-primary" />{person.id === currentUserId ? "Me" : person.name}</label>)}</div>{search.trim() && filteredPeople.length === 0 && <p className="mt-2 text-sm text-muted">No people found.</p>}{sharePreview && <p className="mt-2 text-sm text-muted">{sharePreview}</p>}</fieldset>
    {formError && <p role="alert" className="text-sm text-text">{formError}</p>}
    <div className="flex flex-wrap gap-2"><Button type="submit" disabled={busy}>{busy ? "Saving..." : "Save"}</Button><Button variant="secondary" disabled={busy} onClick={onCancel}>Cancel</Button></div>
  </form>
  </Card>;
}
