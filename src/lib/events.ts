export const EVENTS_BUCKET = "photos";
export const EVENT_SIGNED_URL_SECONDS = 60 * 60 * 24;
export { MAX_OCCURRENCES } from "@/lib/recurrence";

export type Recurrence = "none" | "weekly" | "biweekly" | "monthly";

export const RECURRENCE_OPTIONS: { value: Recurrence; label: string }[] = [
  { value: "none", label: "Doesn't repeat" },
  { value: "weekly", label: "Weekly" },
  { value: "biweekly", label: "Every 2 weeks" },
  { value: "monthly", label: "Monthly" },
];

export const RECURRENCE_LABELS: Record<Recurrence, string> = {
  none: "Doesn't repeat",
  weekly: "Repeats weekly",
  biweekly: "Repeats every 2 weeks",
  monthly: "Repeats monthly",
};

export function isRecurrence(value: string): value is Recurrence {
  return (
    value === "none" ||
    value === "weekly" ||
    value === "biweekly" ||
    value === "monthly"
  );
}

export type SeriesScope = "only" | "following" | "all";

export const SERIES_SCOPE_OPTIONS: { value: SeriesScope; label: string }[] = [
  { value: "only", label: "Only this event" },
  { value: "following", label: "This and following events" },
  { value: "all", label: "All events in the series" },
];

export function isSeriesScope(value: string): value is SeriesScope {
  return value === "only" || value === "following" || value === "all";
}

export type RsvpChoice = "going" | "maybe" | "no";
export type RsvpStatus = RsvpChoice | "waitlist";

export const RSVP_CHOICES: RsvpChoice[] = ["going", "maybe", "no"];

export const RSVP_STATUSES: RsvpStatus[] = [
  "going",
  "maybe",
  "no",
  "waitlist",
];

export const RSVP_LABELS: Record<RsvpStatus, string> = {
  going: "Going",
  maybe: "Maybe",
  no: "Can't",
  waitlist: "Waitlist",
};

export function isRsvpStatus(value: string): value is RsvpStatus {
  return (
    value === "going" ||
    value === "maybe" ||
    value === "no" ||
    value === "waitlist"
  );
}

export function isRsvpChoice(value: string): value is RsvpChoice {
  return value === "going" || value === "maybe" || value === "no";
}

export function isEventCoverPath(value: string, userId: string) {
  const prefix = `events/${userId}/`;

  if (!value.startsWith(prefix)) {
    return false;
  }

  return /^\d+\.jpg$/.test(value.slice(prefix.length));
}

export type EventRecord = {
  id: string;
  title: string;
  description: string | null;
  location: string;
  starts_at: string;
  created_by: string;
  created_at: string;
  cover_path: string | null;
  capacity: number | null;
  recurrence: Recurrence;
  series_id: string | null;
  poll_open: boolean;
};

export type DateVote = "yes" | "maybe";

export const DATE_VOTE_OPTIONS: { value: DateVote; label: string }[] = [
  { value: "yes", label: "Yes" },
  { value: "maybe", label: "Maybe" },
];

export function isDateVote(value: string): value is DateVote {
  return value === "yes" || value === "maybe";
}

export type DateOptionRecord = {
  id: string;
  event_id: string;
  starts_at: string;
};

export type DateVoteRecord = {
  option_id: string;
  user_id: string;
  vote: DateVote;
};

export type PollVoter = {
  id: string;
  name: string;
  username: string | null;
};

export type PollOption = {
  id: string;
  startsAt: string;
  currentVote: DateVote | null;
  yesCount: number;
  maybeCount: number;
  yesVoters: PollVoter[];
  maybeVoters: PollVoter[];
  isLeading: boolean;
};

export type PollSnapshot = {
  options: PollOption[];
  hasVoted: boolean;
};

export type IdeaStatus = "open" | "scheduled" | "dropped";

export type IdeaRecord = {
  id: string;
  title: string;
  description: string | null;
  created_by: string;
  status: string;
  event_id: string | null;
  created_at: string;
};

export type IdeaVoteRecord = {
  idea_id: string;
  user_id: string;
};

export type EventListItem = EventRecord & {
  goingCount: number;
  coverUrl: string | null;
};

export type RsvpPerson = {
  id: string;
  name: string;
  username: string | null;
  avatarUrl: string | null;
  waitlistPosition: number | null;
};

export type RsvpGroups = Record<RsvpStatus, RsvpPerson[]>;

export type RsvpSnapshot = {
  currentStatus: RsvpStatus | null;
  waitlistPosition: number | null;
  goingCount: number;
  totalAnswers: number;
  capacity: number | null;
  groups: RsvpGroups;
};

export type IdeaListItem = {
  id: string;
  title: string;
  description: string | null;
  creatorName: string;
  status: IdeaStatus;
  eventId: string | null;
  createdAt: string;
  voteCount: number;
  hasVoted: boolean;
  isCreator: boolean;
};
