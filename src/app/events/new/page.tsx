import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AppShell, getAuthenticatedUser } from "@/components/app-shell";
import { EventForm } from "@/components/event-form";
import { createEventAction } from "@/app/actions/events";
import { createClient } from "@/lib/supabase/server";

type IdeaPrefill = {
  id: string;
  title: string;
  description: string | null;
};

export default async function NewEventPage({
  searchParams,
}: {
  searchParams: Promise<{ idea?: string; date?: string; hang?: string; title?: string }>;
}) {
  const { idea: ideaParam, date: dateParam, hang: hangParam, title: titleParam } = await searchParams;
  const plannedTitle = titleParam?.trim().slice(0, 120) || null;
  let hangPrefill: { title: string; location: string; startsAt: string } | undefined;

  if (hangParam) {
    const { user: hangUser } = await getAuthenticatedUser();
    const hangSupabase = await createClient();
    const { data: hang } = await hangSupabase
      .from("hangs")
      .select("message,location,created_by")
      .eq("id", hangParam)
      .maybeSingle();

    if (hang && hang.created_by === hangUser.id) {
      const startsAt = new Date(Date.now() + 60 * 60 * 1000);
      const pad = (value: number) => String(value).padStart(2, "0");
      hangPrefill = {
        title: String(hang.message),
        location: String(hang.location ?? ""),
        startsAt: `${startsAt.getFullYear()}-${pad(startsAt.getMonth() + 1)}-${pad(startsAt.getDate())}T${pad(startsAt.getHours())}:${pad(startsAt.getMinutes())}:00`,
      };
    }
  }
  const prefillStartsAt = hangPrefill
    ? hangPrefill.startsAt
    : dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam)
    ? `${dateParam}T19:00:00`
    : undefined;
  const { user } = await getAuthenticatedUser();
  let idea: IdeaPrefill | null = null;

  if (ideaParam) {
    const supabase = await createClient();
    const { data } = await supabase
      .from("event_ideas")
      .select("id,title,description,created_by,status")
      .eq("id", ideaParam)
      .maybeSingle();

    if (data && data.created_by === user.id && data.status === "open") {
      idea = {
        id: data.id,
        title: data.title,
        description: data.description,
      };
    }
  }

  return (
    <AppShell noIsland>
      <section className="space-y-8">
        <div>
          <Link
            href={idea ? "/events/ideas" : "/events"}
            className="inline-flex min-h-11 items-center gap-1.5 text-sm text-muted hover:text-text transition-colors duration-200 ease-out mb-6"
          >
            <ArrowLeft size={24} strokeWidth={1.75} aria-hidden="true" />
            {idea ? "Ideas" : "Events"}
          </Link>
          <h1 className="text-[22px] font-bold leading-tight text-text">
            New event
          </h1>
        </div>

        <EventForm
          // Each prefill source gets its own form, so values never carry over.
          key={`${idea?.id ?? ""}|${hangParam ?? ""}|${plannedTitle ?? ""}|${prefillStartsAt ?? ""}`}
          mode="create"
          action={createEventAction}
          cancelHref={idea ? "/events/ideas" : "/events"}
          initialStartsAt={prefillStartsAt}
          ideaId={idea?.id}
          userId={user.id}
          initialValues={
            plannedTitle && !hangPrefill && !idea
              ? {
                  title: plannedTitle,
                  description: null,
                  location: "",
                }
              : hangPrefill
              ? {
                  title: hangPrefill.title,
                  description: null,
                  location: hangPrefill.location,
                }
              : idea
              ? {
                  title: idea.title,
                  description: idea.description,
                  location: "",
                }
              : undefined
          }
        />
      </section>
    </AppShell>
  );
}
