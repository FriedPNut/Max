export type CostPerson = {
  id: string;
  name: string;
  username: string | null;
};

export type EventExpense = {
  id: string;
  paidBy: CostPerson;
  description: string;
  amountCents: number;
  participantIds: string[];
  createdByMe: boolean;
};

export type EventSettlement = {
  id: string;
  from: CostPerson;
  to: CostPerson;
  amountCents: number;
};

export type EventDebt = {
  from: CostPerson;
  to: CostPerson;
  amountCents: number;
};

export type EventCostsSnapshot = {
  expenses: EventExpense[];
  settlements: EventSettlement[];
  people: CostPerson[];
  goingIds: string[];
  debts: EventDebt[];
  error?: string;
};

export type EventCostsActionResult = {
  error?: string;
  snapshot?: EventCostsSnapshot;
};

// Costs belong to either an event or a trip.
export type CostScope = { kind: "event" | "trip"; id: string };

export type ExpenseInput = {
  description: string;
  amount: string;
  paidBy: string;
  participantIds: string[];
};

export function parseDollarsToCents(value: string): number | null {
  const match = /^(0|[1-9]\d*)(?:\.(\d{1,2}))?$/.exec(value.trim());

  if (!match) {
    return null;
  }

  const wholeDollars = Number(match[1]);
  const fractionalCents = Number((match[2] ?? "").padEnd(2, "0") || "0");
  const amountCents = wholeDollars * 100 + fractionalCents;

  return Number.isSafeInteger(wholeDollars) &&
    Number.isSafeInteger(amountCents) &&
    amountCents > 0
    ? amountCents
    : null;
}

export function formatCents(amountCents: number): string {
  const wholeDollars = Math.floor(amountCents / 100);
  const cents = amountCents % 100;
  const groupedDollars = String(wholeDollars).replace(/\B(?=(\d{3})+(?!\d))/g, ",");

  return `$${groupedDollars}.${String(cents).padStart(2, "0")}`;
}

export function splitCents(amountCents: number, participantIds: string[]) {
  if (!Number.isSafeInteger(amountCents) || amountCents < 0) {
    throw new Error("Amount must be a non-negative integer number of cents.");
  }

  const uniqueIds = [...new Set(participantIds)];

  if (uniqueIds.length === 0) {
    throw new Error("Choose at least one person to split with.");
  }

  const baseShare = Math.floor(amountCents / uniqueIds.length);
  const extraCents = amountCents % uniqueIds.length;

  return new Map(
    uniqueIds.map((id, index) => [id, baseShare + (index < extraCents ? 1 : 0)])
  );
}

export function simplifyDebts(
  balances: Map<string, number>,
  peopleById: Map<string, CostPerson>
): EventDebt[] {
  const creditors = [...balances.entries()]
    .filter(([, balance]) => balance > 0)
    .map(([id, amountCents]) => ({ id, amountCents }));
  const debtors = [...balances.entries()]
    .filter(([, balance]) => balance < 0)
    .map(([id, amountCents]) => ({ id, amountCents: -amountCents }));
  const debts: EventDebt[] = [];
  let creditorIndex = 0;
  let debtorIndex = 0;

  while (creditorIndex < creditors.length && debtorIndex < debtors.length) {
    const creditor = creditors[creditorIndex];
    const debtor = debtors[debtorIndex];
    const amountCents = Math.min(creditor.amountCents, debtor.amountCents);
    const from = peopleById.get(debtor.id);
    const to = peopleById.get(creditor.id);

    if (from && to && amountCents > 0) {
      debts.push({ from, to, amountCents });
    }

    creditor.amountCents -= amountCents;
    debtor.amountCents -= amountCents;

    if (creditor.amountCents === 0) {
      creditorIndex += 1;
    }

    if (debtor.amountCents === 0) {
      debtorIndex += 1;
    }
  }

  return debts;
}

export function calculateEventDebts(
  expenses: Pick<EventExpense, "paidBy" | "amountCents" | "participantIds">[],
  settlements: Pick<EventSettlement, "from" | "to" | "amountCents">[],
  people: CostPerson[]
): EventDebt[] {
  const balances = new Map<string, number>();
  const peopleById = new Map(people.map((person) => [person.id, person]));

  for (const expense of expenses) {
    const shares = splitCents(expense.amountCents, expense.participantIds);
    balances.set(
      expense.paidBy.id,
      (balances.get(expense.paidBy.id) ?? 0) + expense.amountCents
    );

    for (const [userId, shareCents] of shares) {
      balances.set(userId, (balances.get(userId) ?? 0) - shareCents);
    }
  }

  for (const settlement of settlements) {
    balances.set(
      settlement.from.id,
      (balances.get(settlement.from.id) ?? 0) + settlement.amountCents
    );
    balances.set(
      settlement.to.id,
      (balances.get(settlement.to.id) ?? 0) - settlement.amountCents
    );
  }

  return simplifyDebts(balances, peopleById);
}
