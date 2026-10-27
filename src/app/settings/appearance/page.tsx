import Link from "next/link";
import { AppShell, getAuthenticatedUser } from "@/components/app-shell";
import { ThemeSwitcher } from "@/components/theme/theme-switcher";

export default async function AppearancePage() {
  const { user } = await getAuthenticatedUser();

  return (
    <AppShell userId={user.id} title="Appearance">
      <section className="space-y-6">

        <div className="overflow-hidden rounded-card bg-surface">
          <div className="p-4">
            <ThemeSwitcher />
          </div>
          <p className="border-t border-line px-4 py-3 text-sm leading-relaxed text-muted">
            System follows your phone or computer.
          </p>
        </div>
      </section>
    </AppShell>
  );
}
