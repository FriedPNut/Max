import Link from "next/link";
import { ArrowLeft, Bell, ChevronRight, SunMoon } from "lucide-react";
import { AppShell, getAuthenticatedUser } from "@/components/app-shell";
import { Card } from "@/components/ui";

const rows = [
  { href: "/settings/notifications", label: "Notifications", Icon: Bell },
  { href: "/settings/appearance", label: "Appearance", Icon: SunMoon },
];

export default async function SettingsPage() {
  const { user } = await getAuthenticatedUser();

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

        <Card className="overflow-hidden">
          <div className="divide-y divide-line">
            {rows.map(({ href, label, Icon }) => (
              <Link
                key={href}
                href={href}
                className="press-row flex min-h-14 items-center justify-between gap-3 px-4 py-3 transition-colors duration-200 ease-out hover:bg-surface-2"
              >
                <span className="flex min-w-0 items-center gap-3">
                  <Icon
                    size={24}
                    strokeWidth={1.75}
                    aria-hidden="true"
                    className="shrink-0 text-muted"
                  />
                  <span className="text-base text-text">{label}</span>
                </span>
                <ChevronRight
                  size={24}
                  strokeWidth={1.75}
                  aria-hidden="true"
                  className="shrink-0 text-muted"
                />
              </Link>
            ))}
          </div>
        </Card>
      </section>
    </AppShell>
  );
}
