import Link from "next/link";
import { AppShell, getAuthenticatedUser } from "@/components/app-shell";
import { PostComposer } from "@/components/posts/post-composer";
import { createClient } from "@/lib/supabase/server";
import { serverNow } from "@/lib/server-now";

export default async function NewPostPage() {
  const { user } = await getAuthenticatedUser();
  const supabase = await createClient();
  const now = await serverNow();
  const { data: eventRows } = await supabase
    .from("events")
    .select("id,title,starts_at")
    .gte("starts_at", new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString())
    .order("starts_at", { ascending: true });
  const events = (eventRows ?? []).map((event) => ({
    id: String(event.id),
    title: String(event.title),
    startsAt: String(event.starts_at),
  }));

  return (
    <AppShell userId={user.id} title="New post">
      <section className="space-y-8">

        <PostComposer userId={user.id} events={events} />
      </section>
    </AppShell>
  );
}
