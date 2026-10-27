import Link from "next/link";
import { AppShell, getAuthenticatedUser } from "@/components/app-shell";
import { WrappedView } from "@/components/recap/wrapped-view";
import { isWrappedAvailable } from "@/lib/recap";
import { serverNow } from "@/lib/server-now";

export default async function WrappedPage({
  params,
  searchParams,
}: {
  params: Promise<{ year: string }>;
  searchParams: Promise<{ preview?: string }>;
}) {
  const { year: yearParam } = await params;
  const { preview } = await searchParams;
  const { user } = await getAuthenticatedUser();
  const now = await serverNow();

  const year = Number(yearParam);
  const available = isWrappedAvailable({
    year,
    now: new Date(now),
    preview: preview === "1",
  });

  return (
    <AppShell userId={user.id} title="Max Wrapped">
      {available ? (
        <WrappedView key={year} year={year} />
      ) : (
        <section className="space-y-6">
          <p className="text-base text-text">Wrapped opens December 1</p>
        </section>
      )}
    </AppShell>
  );
}
