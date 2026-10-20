import type { createClient } from "@/lib/supabase/server";
import {
  isDateVote,
  type DateOptionRecord,
  type DateVoteRecord,
  type PollOption,
  type PollSnapshot,
  type PollVoter,
} from "@/lib/events";

type ServerClient = Awaited<ReturnType<typeof createClient>>;

type PollProfile = {
  id: string;
  display_name: string | null;
  username: string | null;
};

type PollOptionRow = {
  id: string;
  event_id: string;
  starts_at: string;
};

type PollVoteRow = {
  option_id: string;
  user_id: string;
  vote: string;
};

const POLL_LOAD_ERROR = "Couldn't load the time options. Refresh and try again.";

function pollName(
  profile: PollProfile | undefined,
  userId: string,
  currentUserId: string,
  currentUserName?: string
) {
  const displayName = profile?.display_name?.trim();
  const username = profile?.username?.trim();

  return (
    displayName ||
    username ||
    (userId === currentUserId ? currentUserName?.trim() : "") ||
    "A friend"
  );
}

export async function loadPollSnapshot(
  supabase: ServerClient,
  {
    eventId,
    currentUserId,
    currentUserName,
  }: {
    eventId: string;
    currentUserId: string;
    currentUserName?: string;
  }
): Promise<{ snapshot?: PollSnapshot; error?: string }> {
  const { data: optionData, error: optionError } = await supabase
    .from("date_options")
    .select("id,event_id,starts_at")
    .eq("event_id", eventId)
    .order("starts_at", { ascending: true });

  if (optionError) {
    return { error: POLL_LOAD_ERROR };
  }

  const optionRows = (optionData ?? []) as DateOptionRecord[];
  const optionIds = optionRows.map((option) => option.id);

  if (optionIds.length === 0) {
    return { snapshot: { options: [], hasVoted: false } };
  }

  const { data: voteData, error: voteError } = await supabase
    .from("date_votes")
    .select("option_id,user_id,vote")
    .in("option_id", optionIds);

  if (voteError) {
    return { error: POLL_LOAD_ERROR };
  }

  const voteRows = ((voteData ?? []) as PollVoteRow[]).filter((vote) =>
    isDateVote(vote.vote)
  ) as DateVoteRecord[];
  const voterIds = [...new Set(voteRows.map((vote) => vote.user_id))];
  let profiles: PollProfile[] = [];

  if (voterIds.length > 0) {
    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .select("id,display_name,username")
      .in("id", voterIds);

    if (profileError) {
      return { error: POLL_LOAD_ERROR };
    }

    profiles = (profileData ?? []) as PollProfile[];
  }

  const profilesById = new Map(
    profiles.map((profile) => [profile.id, profile])
  );
  const currentVotes = new Map<string, DateVoteRecord>();
  const votersByOption = new Map<
    string,
    { yes: PollVoter[]; maybe: PollVoter[] }
  >();

  for (const vote of voteRows) {
    if (vote.user_id === currentUserId) {
      currentVotes.set(vote.option_id, vote);
    }

    const groups = votersByOption.get(vote.option_id) ?? {
      yes: [],
      maybe: [],
    };
    const name = pollName(
      profilesById.get(vote.user_id),
      vote.user_id,
      currentUserId,
      currentUserName
    );

    groups[vote.vote].push({
      id: vote.user_id,
      name,
      username: profilesById.get(vote.user_id)?.username?.trim() || null,
    });
    votersByOption.set(vote.option_id, groups);
  }

  for (const groups of votersByOption.values()) {
    groups.yes.sort((a, b) => a.name.localeCompare(b.name));
    groups.maybe.sort((a, b) => a.name.localeCompare(b.name));
  }

  const preliminary = optionRows.map((option) => {
    const groups = votersByOption.get(option.id) ?? { yes: [], maybe: [] };

    return {
      id: option.id,
      startsAt: option.starts_at,
      currentVote: currentVotes.get(option.id)?.vote ?? null,
      yesCount: groups.yes.length,
      maybeCount: groups.maybe.length,
      yesVoters: groups.yes,
      maybeVoters: groups.maybe,
    };
  });
  let leadingIds = new Set<string>();

  if (preliminary.some((option) => option.yesCount + option.maybeCount > 0)) {
    const highestTotal = Math.max(
      ...preliminary.map((option) => option.yesCount + option.maybeCount)
    );
    const totalLeaders = preliminary.filter(
      (option) => option.yesCount + option.maybeCount === highestTotal
    );
    const highestYes = Math.max(
      ...totalLeaders.map((option) => option.yesCount)
    );

    leadingIds = new Set(
      totalLeaders
        .filter((option) => option.yesCount === highestYes)
        .map((option) => option.id)
    );
  }

  const options: PollOption[] = preliminary.map((option) => ({
    ...option,
    isLeading: leadingIds.has(option.id) && option.yesCount + option.maybeCount > 0,
  }));

  return {
    snapshot: {
      options,
      hasVoted: voteRows.some((vote) => vote.user_id === currentUserId),
    },
  };
}

export async function loadPollVoteNeededCount(
  supabase: ServerClient,
  currentUserId: string
): Promise<{ count: number }> {
  const { data: pollData, error: pollError } = await supabase
    .from("events")
    .select("id")
    .eq("poll_open", true);

  if (pollError) {
    return { count: 0 };
  }

  const pollIds = ((pollData ?? []) as { id: string }[]).map(
    (event) => event.id
  );

  if (pollIds.length === 0) {
    return { count: 0 };
  }

  const { data: optionData, error: optionError } = await supabase
    .from("date_options")
    .select("id,event_id")
    .in("event_id", pollIds);

  if (optionError) {
    return { count: 0 };
  }

  const optionRows = (optionData ?? []) as PollOptionRow[];
  const optionIds = optionRows.map((option) => option.id);

  if (optionIds.length === 0) {
    return { count: 0 };
  }

  const { data: voteData, error: voteError } = await supabase
    .from("date_votes")
    .select("option_id")
    .eq("user_id", currentUserId)
    .in("option_id", optionIds);

  if (voteError) {
    return { count: 0 };
  }

  const eventByOption = new Map(
    optionRows.map((option) => [option.id, option.event_id])
  );
  const votedEventIds = new Set(
    ((voteData ?? []) as { option_id: string }[])
      .map((vote) => eventByOption.get(vote.option_id))
      .filter((eventId): eventId is string => Boolean(eventId))
  );
  const eventsWithOptions = new Set(
    optionRows.map((option) => option.event_id)
  );

  return {
    count: pollIds.filter(
      (eventId) =>
        eventsWithOptions.has(eventId) && !votedEventIds.has(eventId)
    ).length,
  };
}
