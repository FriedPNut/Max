import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AppShell } from "@/components/app-shell";

export function PlaceholderPage({ title }: { title: string }) {
  return (
    <AppShell>
      <section className="space-y-8">
        <div>
          <Link
            href="/events"
            className="inline-flex min-h-11 items-center gap-1.5 text-sm text-muted hover:text-text transition-colors duration-150 ease-out mb-6"
          >
            <ArrowLeft size={20} strokeWidth={1.5} aria-hidden="true" />
            Events
          </Link>
          <h1 className="text-[28px] font-semibold leading-tight text-text">
            {title}
          </h1>
        </div>
        <p className="text-sm text-muted">Coming soon.</p>
      </section>
    </AppShell>
  );
}
