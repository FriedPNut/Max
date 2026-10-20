import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AppShell, getAuthenticatedUser } from "@/components/app-shell";
import { PostComposer } from "@/components/posts/post-composer";
import { createClient } from "@/lib/supabase/server";

export default async function NewPostPage() {
  const { user } = await getAuthenticatedUser();
  const supabase = await createClient();
  const { data: eventRows } = await supabase
    .from("events")
    .select("id,title,starts_at")
    .gte("starts_at", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
    .order("starts_at", { ascending: true });
  const events = (eventRows ?? []).map((event) => ({
    id: String(event.id),
    title: String(event.title),
    startsAt: String(event.starts_at),
  }));

  return (
    <AppShell>
      <section className="space-y-8">
        <div>
          <Link
            href="/feed"
            className="inline-flex min-h-11 items-center gap-1.5 text-sm text-muted hover:text-text transition-colors duration-150 ease-out mb-6"
          >
            <ArrowLeft size={20} strokeWidth={1.5} aria-hidden="true" />
            Post
          </Link>

          <h1 className="text-[28px] font-semibold leading-tight text-text">
            New post
          </h1>
        </div>

        <PostComposer userId={user.id} events={events} />
      </section>
    </AppShell>
  );
}
