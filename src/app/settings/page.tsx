import Link from "next/link";
import { ArrowLeft, Bell, ChevronRight, SunMoon } from "lucide-react";
import { AppShell, getAuthenticatedUser } from "@/components/app-shell";

const rows = [
  { href: "/settings/notifications", label: "Notifications", Icon: Bell },
  { href: "/settings/appearance", label: "Appearance", Icon: SunMoon },
];

export default async function SettingsPage() {
  const { user } = await getAuthenticatedUser();

  return (
    <AppShell userId={user.id}>
      <section className="space-y-8">
        <header>
          <Link
            href="/me"
            className="mb-6 inline-flex min-h-11 items-center gap-1.5 text-sm text-muted transition-colors duration-150 hover:text-text"
          >
            <ArrowLeft size={20} strokeWidth={1.5} aria-hidden="true" />
            Profile
          </Link>
          <h1 className="text-[28px] font-semibold leading-tight text-text">
            Settings
          </h1>
        </header>

        <ul className="border-t border-line">
          {rows.map(({ href, label, Icon }) => (
            <li key={href}>
              <Link
                href={href}
                className="flex min-h-11 items-center justify-between gap-3 border-b border-line py-4 transition-colors duration-150 ease-out hover:text-muted"
              >
                <span className="flex min-w-0 items-center gap-3">
                  <Icon
                    size={20}
                    strokeWidth={1.5}
                    aria-hidden="true"
                    className="shrink-0 text-muted"
                  />
                  <span className="text-base text-text">{label}</span>
                </span>
                <ChevronRight
                  size={20}
                  strokeWidth={1.5}
                  aria-hidden="true"
                  className="shrink-0 text-muted"
                />
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </AppShell>
  );
}
