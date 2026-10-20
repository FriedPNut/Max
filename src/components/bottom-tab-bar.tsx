"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Calendar, MessageSquare, Image, User } from "lucide-react";

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
    label: "Feed",
    href: "/feed",
    icon: Image,
    matches: (pathname: string) => pathname.startsWith("/feed"),
  },
  {
    label: "Me",
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
      className="fixed bottom-0 inset-x-0 z-40 bg-paper border-t border-line"
    >
      <div className="mx-auto w-full max-w-[480px] md:max-w-[720px] px-4">
        <ul className="grid grid-cols-4">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = tab.matches(pathname);

            return (
              <li key={tab.label} className="flex">
                <Link
                  href={tab.href}
                  aria-current={isActive ? "page" : undefined}
                  className={`relative flex-1 flex flex-col items-center justify-center gap-1 py-3 min-h-[56px] transition-colors duration-150 ease-out ${
                    isActive ? "text-ink" : "text-muted hover:text-ink"
                  }`}
                >
                  <Icon
                    size={18}
                    strokeWidth={1.5}
                    aria-hidden="true"
                    className="shrink-0"
                  />
                  <span className="font-mono text-xs uppercase tracking-[0.06em]">
                    {tab.label}
                  </span>
                  {isActive && (
                    <span
                      aria-hidden="true"
                      className="absolute bottom-0 left-3 right-3 h-[2px] bg-accent"
                    />
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}
