import Link from "next/link";

const QUICK_LINKS = [
  { label: "Hang now", href: "/hang" },
  { label: "Who’s free", href: "/free" },
  { label: "Lists", href: "/lists" },
  { label: "Trips", href: "/trips" },
  { label: "Birthdays", href: "/birthdays" },
];

export function QuickLinks() {
  return (
    <nav aria-label="Quick links" className="-mx-4 overflow-x-auto px-4" data-no-swipe>
      <ul className="flex gap-2 pb-1">
        {QUICK_LINKS.map((link) => (
          <li key={link.href} className="shrink-0">
            <Link
              href={link.href}
              className="inline-flex min-h-9 items-center rounded-full bg-surface-2 px-3.5 text-sm font-semibold text-text transition-colors duration-200 ease-out"
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
