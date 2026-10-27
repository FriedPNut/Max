import Link from "next/link";
import {
  ArrowLeft,
  Bell,
  ChevronRight,
  Repeat,
  RotateCcw,
  Sparkles,
  SunMoon,
} from "lucide-react";
import { AppShell, getAuthenticatedUser } from "@/components/app-shell";
import { LogoutButton } from "@/components/notifications/logout-button";

const rows = [
  { href: "/recap", label: "Weekly recap", Icon: Repeat },
  { href: "/settings/notifications", label: "Notifications", Icon: Bell },
  { href: "/settings/appearance", label: "Appearance", Icon: SunMoon },
  { href: "/welcome?replay=1", label: "Replay onboarding", Icon: RotateCcw },
];

export default async function SettingsPage() {
  const { user } = await getAuthenticatedUser();
  const wrappedYear = new Date().getMonth() >= 11 ? new Date().getFullYear() : null;
  const allRows = wrappedYear
    ? [...rows, { href: `/wrapped/${wrappedYear}`, label: "Max Wrapped", Icon: Sparkles }]
    : rows;

  return (
    <AppShell userId={user.id}>
      <section className="space-y-6">
        <header>
          <Link
            href="/me"
            aria-label="Back to profile"
            className="-ml-2 inline-flex h-11 w-11 items-center justify-center rounded-full text-text transition-colors duration-200 ease-out hover:bg-surface-2"
          >
            <ArrowLeft size={24} strokeWidth={1.75} aria-hidden="true" />
          </Link>
          <h1 className="mt-4 text-[22px] font-bold leading-tight text-text">
            Settings
          </h1>
        </header>

        <div className="overflow-hidden rounded-card bg-surface">
          <ul className="divide-y divide-line">
            {allRows.map(({ href, label, Icon }) => (
              <li key={href}>
                <Link
                  href={href}
                  className="press-row flex min-h-11 items-center justify-between gap-3 px-4 py-3 transition-colors duration-200 ease-out hover:bg-surface-2"
                >
                  <span className="flex min-w-0 items-center gap-3">
                    <Icon
                      size={24}
                      strokeWidth={1.75}
                      aria-hidden="true"
                      className="shrink-0 text-text"
                    />
                    <span className="text-[15px] text-text">{label}</span>
                  </span>
                  <ChevronRight
                    size={20}
                    strokeWidth={1.75}
                    aria-hidden="true"
                    className="shrink-0 text-muted"
                  />
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="overflow-hidden rounded-card bg-surface">
          <LogoutButton />
        </div>
      </section>
    </AppShell>
  );
}
