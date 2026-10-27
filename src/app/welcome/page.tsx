import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAuthenticatedUser } from "@/components/app-shell";
import { OnboardingFlow } from "@/components/onboarding/onboarding-flow";
import { resolveProfileAvatarUrls } from "@/lib/profile-data";
import { suggestUsername } from "@/lib/onboarding";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Welcome · Max",
};

type OnboardingProfile = {
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
  birth_month: number | null;
  birth_day: number | null;
  birth_year: number | null;
  onboarded_at: string | null;
};

export default async function WelcomePage({
  searchParams,
}: {
  searchParams: Promise<{ replay?: string }>;
}) {
  const { replay: replayParam } = await searchParams;
  // Replay works for everyone and never touches onboarded_at.
  const replay = replayParam === "1";

  const { user, displayName: authName } = await getAuthenticatedUser();
  const supabase = await createClient();

  const { data } = await supabase
    .from("profiles")
    .select(
      "display_name,username,avatar_url,birth_month,birth_day,birth_year,onboarded_at"
    )
    .eq("id", user.id)
    .maybeSingle();

  const profile = (data ?? null) as OnboardingProfile | null;

  if (!replay && profile?.onboarded_at) {
    redirect("/events");
  }

  const displayName = profile?.display_name?.trim() || authName;
  const username =
    profile?.username?.trim() || suggestUsername(displayName, user.id);

  let avatarUrl: string | null = null;

  if (profile?.avatar_url) {
    const urls = await resolveProfileAvatarUrls(supabase, [
      { id: user.id, avatar_url: profile.avatar_url },
    ]);
    avatarUrl = urls.get(user.id) ?? null;
  }

  return (
    <OnboardingFlow
      userId={user.id}
      initialName={displayName}
      initialUsername={username}
      initialAvatarUrl={avatarUrl}
      initialBirthday={{
        month: profile?.birth_month ?? null,
        day: profile?.birth_day ?? null,
        year: profile?.birth_year ?? null,
      }}
      replay={replay}
    />
  );
}
