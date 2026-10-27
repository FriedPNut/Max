import Link from "next/link";
import { notFound } from "next/navigation";
import { Search } from "lucide-react";
import { AppShell, getAuthenticatedUser } from "@/components/app-shell";
import { LocalTime } from "@/components/local-time";
import { Input } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";
import { nicknameMap } from "@/lib/chat-details";
import { messagePreview } from "@/lib/ideas";
import {
  profileName,
  type ChatProfile,
  type ConversationMemberRecord,
  type MessageRecord,
} from "@/lib/chat";

type SearchConversation = {
  id: string;
  name: string | null;
  is_group: boolean;
};

export default async function ChatSearchPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ q?: string }>;
}) {
  const { id } = await params;
  const { q = "" } = await searchParams;
  const query = q.trim();
  const { user } = await getAuthenticatedUser();
  const supabase = await createClient();

  const { data: membershipData } = await supabase
    .from("conversation_members")
    .select("conversation_id,cleared_at")
    .eq("conversation_id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  const membership = membershipData as {
    conversation_id: string;
    cleared_at: string | null;
  } | null;

  if (!membership) {
    notFound();
  }

  const { data: conversationData } = await supabase
    .from("conversations")
    .select("id,name,is_group")
    .eq("id", id)
    .maybeSingle();

  const conversation = conversationData as SearchConversation | null;

  if (!conversation) {
    notFound();
  }

  const [memberResult, nicknameResult, hiddenResult] = await Promise.all([
    supabase
      .from("conversation_members")
      .select("conversation_id,user_id,last_read_at")
      .eq("conversation_id", id),
    supabase
      .from("conversation_nicknames")
      .select("user_id,nickname")
      .eq("conversation_id", id),
    supabase
      .from("message_hidden")
      .select("message_id")
      .eq("user_id", user.id),
  ]);

  const members = (memberResult.data ?? []) as ConversationMemberRecord[];
  const nicknames = nicknameMap(
    (nicknameResult.data ?? []) as { user_id: string; nickname: string | null }[]
  );
  const hiddenIds = new Set(
    ((hiddenResult.data ?? []) as { message_id: string }[]).map(
      (row) => row.message_id
    )
  );

  const memberIds = members.map((member) => member.user_id);
  let profiles: ChatProfile[] = [];

  if (memberIds.length > 0) {
    const { data } = await supabase
      .from("profiles")
      .select("id,display_name,avatar_url,username")
      .in("id", memberIds);

    profiles = (data ?? []) as ChatProfile[];
  }

  const profilesById = new Map(
    profiles.map((profile) => [profile.id, profile])
  );

  function nameOf(userId: string) {
    const profile = profilesById.get(userId);
    const fallback = userId === user.id ? "You" : profileName(profile);

    return nicknames.get(userId) ?? fallback;
  }

  let results: MessageRecord[] = [];
  let searchError = false;
  const canSearch = query.length >= 2;

  if (canSearch) {
    const escaped = query.replace(/[\\%_]/g, (char) => `\\${char}`);
    // Shared ideas are searchable by their title, even with no note.
    const { data: ideaRows } = await supabase
      .from("event_ideas")
      .select("id")
      .ilike("title", `%${escaped}%`)
      .limit(50);
    const ideaIds = ((ideaRows ?? []) as { id: string }[]).map(
      (row) => row.id
    );
    const baseQuery = () => {
      let request = supabase
        .from("messages")
        .select(
          "id,conversation_id,user_id,body,created_at,image_path,edited_at,deleted_at,mentions,idea_id"
        )
        .eq("conversation_id", id)
        .is("deleted_at", null);

      if (membership.cleared_at) {
        request = request.gt("created_at", membership.cleared_at);
      }

      return request;
    };

    const [bodyResult, ideaResult] = await Promise.all([
      baseQuery()
        .ilike("body", `%${escaped}%`)
        .order("created_at", { ascending: false })
        .limit(50),
      ideaIds.length > 0
        ? baseQuery()
            .in("idea_id", ideaIds)
            .order("created_at", { ascending: false })
            .limit(50)
        : Promise.resolve({ data: [], error: null }),
    ]);
    searchError = Boolean(bodyResult.error || ideaResult.error);
    const byId = new Map<string, MessageRecord>();

    for (const message of [
      ...((ideaResult.data ?? []) as MessageRecord[]),
      ...((bodyResult.data ?? []) as MessageRecord[]),
    ]) {
      if (!byId.has(message.id) && !hiddenIds.has(message.id)) {
        byId.set(message.id, message);
      }
    }

    results = [...byId.values()]
      .sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )
      .slice(0, 50);
  }

  return (
    <AppShell title="Search">
      <section className="space-y-5">
        <form method="get" role="search" className="relative">
          <Search
            size={20}
            strokeWidth={1.75}
            aria-hidden="true"
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted"
          />
          <Input
            name="q"
            type="search"
            defaultValue={query}
            autoComplete="off"
            autoFocus
            placeholder="Search this chat"
            aria-label="Search this chat"
            pill
            className="bg-surface-2"
            style={{ paddingLeft: "2.75rem" }}
          />
        </form>

        {!canSearch ? (
          <p className="text-[13px] text-muted">
            Type at least two letters to search this chat.
          </p>
        ) : searchError ? (
          <p role="alert" className="text-[13px] text-muted">
            Couldn&apos;t search right now. Try again.
          </p>
        ) : results.length === 0 ? (
          <p className="text-[13px] text-muted">No messages match that.</p>
        ) : (
          <ul className="divide-y divide-line border-y border-line">
            {results.map((message) => (
              <li key={message.id}>
                <Link
                  href={`/chat/${conversation.id}?m=${message.id}`}
                  className="flex flex-col gap-1 px-1 py-3 transition-colors duration-200 ease-out hover:bg-surface-2"
                >
                  <span className="flex items-baseline justify-between gap-3">
                    <span className="truncate text-[13px] font-semibold text-text">
                      {nameOf(message.user_id)}
                    </span>
                    <LocalTime
                      iso={message.created_at}
                      format="card"
                      className="shrink-0 text-[12px] text-muted"
                    />
                  </span>
                  <span className="line-clamp-2 text-[14px] text-text">
                    {messagePreview(message) ?? ""}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </AppShell>
  );
}
