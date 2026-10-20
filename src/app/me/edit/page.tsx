import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AppShell, getAuthenticatedUser } from "@/components/app-shell";
import { ProfileEditForm } from "@/components/profile/profile-edit-form";
import { createClient } from "@/lib/supabase/server";
import {
  PROFILE_BUCKET,
  PROFILE_SIGNED_URL_SECONDS,
  type ProfileRecord,
} from "@/lib/profile";

export default async function EditProfilePage() {
  const { user, displayName } = await getAuthenticatedUser();
  const supabase = await createClient();

  const { data: profileData, error: profileError } = await supabase
    .from("profiles")
    .select("id,display_name,avatar_url,username,bio")
    .eq("id", user.id)
    .maybeSingle();

  const profile: ProfileRecord = {
    id: user.id,
    display_name: profileData?.display_name?.trim() || displayName,
    avatar_url: profileData?.avatar_url ?? null,
    username: profileData?.username ?? null,
    bio: profileData?.bio ?? null,
  };

  let avatarUrl: string | null = null;
  const avatarPath = profile.avatar_url?.trim() || null;

  if (avatarPath) {
    if (/^https?:\/\//i.test(avatarPath)) {
      avatarUrl = avatarPath;
    } else {
      const { data } = await supabase.storage
        .from(PROFILE_BUCKET)
        .createSignedUrl(avatarPath, PROFILE_SIGNED_URL_SECONDS);

      avatarUrl = data?.signedUrl ?? null;
    }
  }

  return (
    <AppShell>
      <section className="space-y-8">
        <div>
          <Link
            href="/me"
            className="inline-flex min-h-11 items-center gap-1.5 text-sm text-muted hover:text-text transition-colors duration-150 ease-out mb-6"
          >
            <ArrowLeft size={20} strokeWidth={1.5} aria-hidden="true" />
            Profile
          </Link>

          <h1 className="text-[28px] font-semibold leading-tight text-text">
            Edit profile
          </h1>
        </div>

        {profileError ? (
          <p className="text-sm text-muted">
            Couldn&apos;t load your profile. Refresh and try again.
          </p>
        ) : (
          <ProfileEditForm profile={profile} avatarUrl={avatarUrl} />
        )}
      </section>
    </AppShell>
  );
}
