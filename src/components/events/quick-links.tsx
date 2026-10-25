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
    <nav aria-label="Quick links" className="-mx-4 overflow-x-auto px-4">
      <ul className="flex gap-2 pb-1">
        {QUICK_LINKS.map((link) => (
          <li key={link.href} className="shrink-0">
            <Link
              href={link.href}
              className="inline-flex min-h-11 items-center rounded-full border border-border bg-surface px-4 text-sm text-text transition-colors duration-150 ease-out hover:bg-background"
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
