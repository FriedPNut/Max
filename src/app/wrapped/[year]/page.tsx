import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AppShell, getAuthenticatedUser } from "@/components/app-shell";
import { WrappedView } from "@/components/recap/wrapped-view";
import { isWrappedAvailable } from "@/lib/recap";

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

  const year = Number(yearParam);
  const available = isWrappedAvailable({
    year,
    preview: preview === "1",
  });

  return (
    <AppShell userId={user.id} noIsland={available}>
      {available ? (
        <WrappedView key={year} year={year} />
      ) : (
        <section className="space-y-6">
          <Link
            href="/me"
            className="inline-flex min-h-11 items-center gap-1.5 text-sm text-muted transition-colors duration-200 ease-out hover:text-text"
          >
            <ArrowLeft size={24} strokeWidth={1.75} aria-hidden="true" />
            Profile
          </Link>

          <h1 className="text-[22px] font-bold leading-tight text-text">
            Max Wrapped
          </h1>

          <p className="text-base text-text">Wrapped opens December 1</p>
        </section>
      )}
    </AppShell>
  );
}
