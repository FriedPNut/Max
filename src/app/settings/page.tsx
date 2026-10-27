import Link from "next/link";
import { Suspense } from "react";
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
import { ChatColorRow } from "@/components/settings/chat-color-row";
import { ReadReceiptsRow } from "@/components/settings/read-receipts-row";
import { createClient } from "@/lib/supabase/server";
import { serverNow } from "@/lib/server-now";

const rows = [
  { href: "/recap", label: "Weekly recap", Icon: Repeat },
  { href: "/settings/notifications", label: "Notifications", Icon: Bell },
  { href: "/settings/appearance", label: "Appearance", Icon: SunMoon },
  { href: "/welcome?replay=1", label: "Replay onboarding", Icon: RotateCcw },
];

const rowClass =
  "press-row flex min-h-11 items-center justify-between gap-3 px-4 py-3 transition-colors duration-200 ease-out hover:bg-surface-2";

function RowBody({
  href,
  label,
  Icon,
}: {
  href: string;
  label: string;
  Icon: typeof Bell;
}) {
  return (
    <Link href={href} className={rowClass}>
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
  );
}

/**
 * Max Wrapped only exists in December, so the row reads the request clock.
 * The read happens on the server, after `io()`, inside its own Suspense
 * boundary: it is never part of the prerendered shell.
 */
async function WrappedRow() {
  const date = new Date(await serverNow());

  if (date.getMonth() < 11) {
    return null;
  }

  return (
    <li>
      <RowBody
        href={`/wrapped/${date.getFullYear()}`}
        label="Max Wrapped"
        Icon={Sparkles}
      />
    </li>
  );
}

export default async function SettingsPage() {
  const { user } = await getAuthenticatedUser();
  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("bubble_color,read_receipts")
    .eq("id", user.id)
    .maybeSingle();

  return (
    <AppShell userId={user.id} title="Settings">
      <section className="space-y-6">

        <div className="overflow-hidden rounded-card bg-surface">
          <ul className="divide-y divide-line">
            {rows.map(({ href, label, Icon }) => (
              <li key={href}>
                <RowBody href={href} label={label} Icon={Icon} />
              </li>
            ))}
            <Suspense fallback={null}>
              <WrappedRow />
            </Suspense>
          </ul>
        </div>

        <div className="overflow-hidden rounded-card bg-surface">
          <ChatColorRow
            initialColor={(profile as { bubble_color?: string | null } | null)?.bubble_color ?? null}
          />
        </div>

        <div className="overflow-hidden rounded-card bg-surface pt-2">
          <ReadReceiptsRow
            initial={
              (profile as { read_receipts?: boolean | null } | null)
                ?.read_receipts !== false
            }
          />
        </div>

        <div className="overflow-hidden rounded-card bg-surface">
          <LogoutButton />
        </div>
      </section>
    </AppShell>
  );
}
