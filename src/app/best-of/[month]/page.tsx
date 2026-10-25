import { notFound } from "next/navigation";
import { AppShell, getAuthenticatedUser } from "@/components/app-shell";
import { BestOfResult } from "@/components/best-of/best-of-result";
import { parseMonthKey } from "@/lib/best-of";

export default async function BestOfMonthPage({
  params,
}: {
  params: Promise<{ month: string }>;
}) {
  const { month } = await params;

  if (!parseMonthKey(month)) {
    notFound();
  }

  const { user } = await getAuthenticatedUser();

  return (
    <AppShell userId={user.id}>
      <BestOfResult monthKey={month} />
    </AppShell>
  );
}
