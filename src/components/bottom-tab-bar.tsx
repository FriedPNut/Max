"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Calendar, MessageSquare, SquarePlus, User } from "lucide-react";

const TABS = [
  {
    label: "Events",
    href: "/events",
    icon: Calendar,
    matches: (pathname: string) =>
      pathname === "/" || pathname.startsWith("/events"),
  },
  {
    label: "Chat",
    href: "/chat",
    icon: MessageSquare,
    matches: (pathname: string) => pathname.startsWith("/chat"),
  },
  {
    label: "Post",
    href: "/feed",
    icon: SquarePlus,
    matches: (pathname: string) => pathname.startsWith("/feed"),
  },
  {
    label: "Profile",
    href: "/me",
    icon: User,
    matches: (pathname: string) => pathname.startsWith("/me"),
  },
] as const;

export function BottomTabBar() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Primary navigation"
      className="fixed bottom-0 inset-x-0 z-40 bg-surface border-t border-line"
      style={{
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
        paddingLeft: "env(safe-area-inset-left, 0px)",
        paddingRight: "env(safe-area-inset-right, 0px)",
      }}
    >
      <div className="mx-auto w-full max-w-[560px] px-4">
        <ul className="grid grid-cols-4">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = tab.matches(pathname);

            return (
              <li key={tab.label} className="flex">
                <Link
                  href={tab.href}
                  aria-current={isActive ? "page" : undefined}
                  className={`relative flex-1 flex flex-col items-center justify-center gap-1 py-1.5 min-h-[56px] text-xs transition-colors duration-150 ease-out ${
                    isActive ? "text-text" : "text-muted hover:text-text"
                  }`}
                >
                  {isActive && (
                    <span
                      aria-hidden="true"
                      className="absolute top-0 left-1/2 h-[2px] w-6 -translate-x-1/2 bg-accent"
                    />
                  )}

                  <Icon
                    size={24}
                    strokeWidth={1.5}
                    aria-hidden="true"
                    className="shrink-0"
                  />
                  <span>{tab.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}
