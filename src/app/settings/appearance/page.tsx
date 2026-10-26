import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AppShell, getAuthenticatedUser } from "@/components/app-shell";
import { ThemeSwitcher } from "@/components/theme/theme-switcher";
import { Card } from "@/components/ui";

export default async function AppearancePage() {
  const { user } = await getAuthenticatedUser();

  return (
    <AppShell userId={user.id}>
      <section className="space-y-6">
        <header>
          <Link
            href="/settings"
            aria-label="Back to settings"
            className="-ml-2 inline-flex h-11 w-11 items-center justify-center rounded-full text-text transition-colors duration-200 ease-out hover:bg-surface-2"
          >
            <ArrowLeft size={24} strokeWidth={1.75} aria-hidden="true" />
          </Link>
          <h1 className="mt-4 text-[22px] font-bold leading-tight text-text">
            Appearance
          </h1>
        </header>

        <Card className="overflow-hidden">
          <div className="p-4">
            <ThemeSwitcher />
          </div>
          <p className="border-t border-line px-4 py-3 text-sm leading-relaxed text-muted">
            System follows your phone or computer.
          </p>
        </Card>
      </section>
    </AppShell>
  );
}
