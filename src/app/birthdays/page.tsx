import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AppShell, getAuthenticatedUser } from "@/components/app-shell";
import { buttonStyles } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import {
  daysUntilBirthday,
  formatBirthdayDate,
  nextBirthday,
  untilLabel,
} from "@/lib/birthdays";

const WINDOW_DAYS = 60;

type FriendBirthday = {
  id: string;
  name: string;
  username: string | null;
  month: number;
  day: number;
  days: number;
};

export default async function BirthdaysPage() {
  const { user } = await getAuthenticatedUser();
  const supabase = await createClient();

  const { data: friendshipData } = await supabase
    .from("friendships")
    .select("requester_id,addressee_id")
    .eq("status", "accepted")
    .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`);

  const friendIds = [
    ...new Set(
      ((friendshipData ?? []) as { requester_id: string; addressee_id: string }[]).map((row) =>
        row.requester_id === user.id ? row.addressee_id : row.requester_id
      )
    ),
  ];

  let upcoming: FriendBirthday[] = [];

  if (friendIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id,display_name,username,birth_month,birth_day")
      .in("id", friendIds)
      .not("birth_month", "is", null)
      .not("birth_day", "is", null);

    upcoming = ((profiles ?? []) as {
      id: string;
      display_name: string | null;
      username: string | null;
      birth_month: number;
      birth_day: number;
    }[])
      .map((profile) => ({
        id: profile.id,
        name: profile.display_name?.trim() || profile.username?.trim() || "A friend",
        username: profile.username?.trim() || null,
        month: profile.birth_month,
        day: profile.birth_day,
        days: daysUntilBirthday(profile.birth_month, profile.birth_day),
      }))
      .filter((person) => person.days >= 0 && person.days <= WINDOW_DAYS)
      .sort((a, b) => a.days - b.days || a.name.localeCompare(b.name));
  }

  return (
    <AppShell userId={user.id}>
      <section className="space-y-8">
        <div>
          <Link
            href="/events"
            className="mb-6 inline-flex min-h-11 items-center gap-1.5 text-sm text-muted transition-colors duration-200 ease-out hover:text-text"
          >
            <ArrowLeft size={24} strokeWidth={1.75} aria-hidden="true" />
            Events
          </Link>
          <h1 className="text-[22px] font-bold leading-tight text-text">Birthdays</h1>
        </div>

        {upcoming.length === 0 ? (
          <p className="text-sm text-muted">
            No birthdays coming up. Ask friends to add theirs in their profile.
          </p>
        ) : (
          <ul className="border-t border-line">
            {upcoming.map((person) => {
              const dateLabel = formatBirthdayDate(person.month, person.day);
              const planTitle = `${person.name}’s birthday`;
              const planDate = toDateKey(nextBirthday(person.month, person.day));

              return (
                <li key={person.id} className="-mx-4 flex min-h-14 items-center justify-between gap-3 border-b border-line px-4 py-4">
                  <div className="min-w-0">
                    {person.username ? (
                      <Link href={`/u/${encodeURIComponent(person.username)}`} className="block truncate text-base font-semibold text-text hover:opacity-80">
                        {person.name}
                      </Link>
                    ) : (
                      <p className="truncate text-base font-semibold text-text">{person.name}</p>
                    )}
                    <p className="text-sm text-muted">
                      {dateLabel} · {untilLabel(person.days)}
                    </p>
                  </div>
                  <Link
                    href={`/events/new?title=${encodeURIComponent(planTitle)}&date=${planDate}`}
                    className={`${buttonStyles({ variant: "secondary", size: "sm" })} shrink-0`}
                  >
                    Plan something
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </AppShell>
  );
}

function toDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate()
  ).padStart(2, "0")}`;
}
