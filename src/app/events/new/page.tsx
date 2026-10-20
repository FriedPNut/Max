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
  searchParams: Promise<{ idea?: string }>;
}) {
  const { idea: ideaParam } = await searchParams;
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
    <AppShell>
      <section className="space-y-8">
        <div>
          <Link
            href={idea ? "/events/ideas" : "/events"}
            className="inline-flex min-h-11 items-center gap-1.5 text-sm text-muted hover:text-text transition-colors duration-150 ease-out mb-6"
          >
            <ArrowLeft size={20} strokeWidth={1.5} aria-hidden="true" />
            {idea ? "Ideas" : "Events"}
          </Link>
          <h1 className="text-[28px] font-semibold leading-tight text-text">
            New event
          </h1>
        </div>

        <EventForm
          mode="create"
          action={createEventAction}
          cancelHref={idea ? "/events/ideas" : "/events"}
          ideaId={idea?.id}
          userId={user.id}
          initialValues={
            idea
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
