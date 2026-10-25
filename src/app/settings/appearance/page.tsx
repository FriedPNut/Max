import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AppShell, getAuthenticatedUser } from "@/components/app-shell";
import { ThemeSwitcher } from "@/components/theme/theme-switcher";

export default async function AppearancePage() {
  const { user } = await getAuthenticatedUser();

  return (
    <AppShell userId={user.id}>
      <section className="space-y-8">
        <header>
          <Link
            href="/settings"
            className="mb-6 inline-flex min-h-11 items-center gap-1.5 text-sm text-muted transition-colors duration-150 hover:text-text"
          >
            <ArrowLeft size={20} strokeWidth={1.5} aria-hidden="true" />
            Settings
          </Link>
          <h1 className="text-[28px] font-semibold leading-tight text-text">
            Appearance
          </h1>
        </header>

        <div className="space-y-3">
          <ThemeSwitcher />
          <p className="text-sm leading-relaxed text-muted">
            System follows your phone or computer.
          </p>
        </div>
      </section>
    </AppShell>
  );
}
