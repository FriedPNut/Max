import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AppShell } from "@/components/app-shell";

export default function EventNotFound() {
  return (
    <AppShell>
      <section className="space-y-6">
        <Link
          href="/events"
          className="inline-flex min-h-11 items-center gap-1.5 text-sm text-muted hover:text-text transition-colors duration-150 ease-out"
        >
          <ArrowLeft size={20} strokeWidth={1.5} aria-hidden="true" />
          Events
        </Link>

        <div className="space-y-2">
          <h1 className="text-[28px] font-semibold leading-tight text-text">
            Event not found
          </h1>
          <p className="text-sm text-muted">
            This event may have been deleted.
          </p>
        </div>
      </section>
    </AppShell>
  );
}
