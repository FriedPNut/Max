"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";
import { InfoButton } from "@/components/info/info-button";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { useShellActions, useShellProfile } from "@/lib/shell-state";
import { isRootTabPath } from "@/lib/tabs";

const headerShell =
  "glass sticky top-0 z-40";
const headerInner =
  "mx-auto flex w-full max-w-[560px] items-center gap-2 px-4";

/**
 * The root header: wordmark left, notifications and the page's actions right.
 * Only ever rendered by the shell, on the four tab roots.
 */
export function MainHeader({
  scrolled = false,
  divider = true,
}: {
  scrolled?: boolean;
  divider?: boolean;
}) {
  const pathname = usePathname();
  const actions = useShellActions(pathname);
  const profile = useShellProfile();

  return (
    <header
      className={headerShell}
      data-no-swipe
      style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
    >
      <div className={`${headerInner} h-14 justify-between`}>
        <Link
          href="/events"
          aria-label="Max"
          className="inline-flex min-h-11 items-center text-[20px] font-extrabold leading-none tracking-[-0.03em] text-text"
        >
          Max
        </Link>

        {/* Left to right: info, heart, then the page's own actions. */}
        <div className="flex shrink-0 items-center gap-1">
          {pathname === "/events" ? <InfoButton /> : null}
          <NotificationBell userId={profile?.userId ?? null} />
          {actions}
        </div>
      </div>

      {divider ? (
        <div
          aria-hidden="true"
          className="h-px bg-line transition-opacity duration-200 ease-out"
          style={{ opacity: scrolled ? 1 : 0 }}
        />
      ) : null}
    </header>
  );
}

/** Where the back arrow goes when there is no in-app history to return to. */
export function parentPath(pathname: string) {
  const parts = pathname.split("/").filter(Boolean);
  parts.pop();
  const parent = parts.length > 0 ? `/${parts.join("/")}` : "";

  if (!parent || parent === "/u") {
    return "/events";
  }

  return parent;
}

/**
 * Every screen that is not a tab root: a back arrow, a left-aligned title and
 * optional actions. No wordmark and no notification heart.
 */
export function SubHeader({
  title,
  actions,
}: {
  title: string;
  actions?: ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const fallback = parentPath(pathname);

  // The shell owns the header on the four tab roots.
  if (isRootTabPath(pathname)) {
    return null;
  }

  function goBack() {
    if (window.history.length > 1) {
      router.back();
      return;
    }

    router.push(fallback);
  }

  return (
    <header
      className={headerShell}
      data-no-swipe
      style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
    >
      <div className={`${headerInner} h-14`}>
        <button
          type="button"
          onClick={goBack}
          aria-label="Back"
          className="-ml-2 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-text transition-colors duration-200 ease-out hover:bg-surface-2 active:opacity-60"
        >
          <ArrowLeft size={24} strokeWidth={1.75} aria-hidden="true" />
        </button>

        <h1 className="min-w-0 flex-1 truncate text-[20px] font-bold leading-tight text-text">
          {title}
        </h1>

        <div className="flex shrink-0 items-center gap-1">{actions}</div>
      </div>
    </header>
  );
}
