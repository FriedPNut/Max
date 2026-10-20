"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { updateProfileAction } from "@/app/actions/profile";
import {
  MAX_UPLOAD_BYTES,
  resizeImageSquare,
  uploadImageWithProgress,
} from "@/lib/client-image";
import {
  BIO_MAX_LENGTH,
  DISPLAY_NAME_MAX_LENGTH,
  PROFILE_BUCKET,
  USERNAME_MAX_LENGTH,
  USERNAME_MIN_LENGTH,
  isValidUsername,
  nameInitial,
  normalizeUsername,
  profileDisplayName,
  type ProfileRecord,
} from "@/lib/profile";
import { ProfileAvatar } from "@/components/profile/profile-avatar";
import { createClient } from "@/lib/supabase/client";

const AVATAR_SIZE = 400;
const JPEG_QUALITY = 0.8;

const fieldClass =
  "w-full bg-surface text-text placeholder:text-muted border border-line rounded-lg px-3 py-3 text-base leading-snug focus:outline-2 focus:outline-offset-0 focus:outline-text";

const labelClass = "block text-sm text-muted mb-2";

type Phase = "idle" | "preparing" | "uploading" | "saving";

export function ProfileEditForm({
  profile,
  avatarUrl,
}: {
  profile: ProfileRecord;
  avatarUrl: string | null;
}) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [displayName, setDisplayName] = useState(
    profile.display_name?.trim() || profileDisplayName(profile)
  );
  const [username, setUsername] = useState(profile.username ?? "");
  const [bio, setBio] = useState(profile.bio ?? "");
  const [avatarBlob, setAvatarBlob] = useState<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const previewRef = useRef<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const busy = phase !== "idle";

  useEffect(() => {
    return () => {
      if (previewRef.current) {
        URL.revokeObjectURL(previewRef.current);
      }
    };
  }, []);

  function replacePreview(blob: Blob | null) {
    if (previewRef.current) {
      URL.revokeObjectURL(previewRef.current);
    }

    const nextUrl = blob ? URL.createObjectURL(blob) : null;
    previewRef.current = nextUrl;
    setPreviewUrl(nextUrl);
    setAvatarBlob(blob);
  }

  async function handleFileChange(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file || busy) {
      return;
    }

    setError(null);

    if (file.type && !file.type.startsWith("image/")) {
      setError("Pick a photo.");
      return;
    }

    if (file.size > MAX_UPLOAD_BYTES) {
      setError("That photo is too big. Pick one under 30 MB.");
      return;
    }

    setPhase("preparing");
    setProgress(0);

    try {
      const resized = await resizeImageSquare(
        file,
        AVATAR_SIZE,
        JPEG_QUALITY
      );
      replacePreview(resized);
      setPhase("idle");
    } catch {
      setError("Couldn't read that photo. Try another one.");
      setPhase("idle");
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (busy) {
      return;
    }

    const cleanName = displayName.trim();
    const cleanUsername = normalizeUsername(username);
    const cleanBio = bio.trim();

    if (!cleanName) {
      setError("Add a display name.");
      return;
    }

    if (cleanName.length > DISPLAY_NAME_MAX_LENGTH) {
      setError(
        `Keep your display name under ${DISPLAY_NAME_MAX_LENGTH} characters.`
      );
      return;
    }

    if (!cleanUsername) {
      setError("Pick a username.");
      return;
    }

    if (cleanUsername.length < USERNAME_MIN_LENGTH) {
      setError(
        `Use at least ${USERNAME_MIN_LENGTH} characters for your username.`
      );
      return;
    }

    if (!isValidUsername(cleanUsername)) {
      setError(
        cleanUsername.length > USERNAME_MAX_LENGTH
          ? `Keep your username under ${USERNAME_MAX_LENGTH} characters.`
          : "Use lowercase letters, numbers, and underscores only."
      );
      return;
    }

    if (cleanBio.length > BIO_MAX_LENGTH) {
      setError(`Keep your bio under ${BIO_MAX_LENGTH} characters.`);
      return;
    }

    setError(null);
    let uploadedPath: string | null = null;

    if (avatarBlob) {
      setPhase("uploading");
      setProgress(0);

      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session?.access_token) {
          setError("You're signed out. Refresh and try again.");
          setPhase("idle");
          return;
        }

        uploadedPath = `avatars/${profile.id}/${Date.now()}.jpg`;

        await uploadImageWithProgress({
          file: avatarBlob,
          bucket: PROFILE_BUCKET,
          path: uploadedPath,
          token: session.access_token,
          onProgress: setProgress,
        });
      } catch {
        setError("Couldn't upload that photo. Try again.");
        setPhase("idle");
        setProgress(0);
        return;
      }
    }

    setPhase("saving");

    try {
      const result = await updateProfileAction({
        displayName: cleanName,
        username: cleanUsername,
        bio: cleanBio,
        avatarPath: uploadedPath ?? profile.avatar_url ?? "",
      });

      if (result.error) {
        if (uploadedPath) {
          try {
            await supabase.storage.from(PROFILE_BUCKET).remove([uploadedPath]);
          } catch {
            // Cleanup is best effort; show the save error either way.
          }
        }

        setError(result.error);
        setPhase("idle");
        setProgress(0);
        return;
      }

      router.replace("/me");
    } catch {
      setError("Couldn't save your profile. Try again.");
      setPhase("idle");
      setProgress(0);
    }
  }

  const buttonLabel =
    phase === "preparing"
      ? "Preparing..."
      : phase === "uploading"
      ? "Uploading..."
      : phase === "saving"
      ? "Saving..."
      : "Save";

  const initial = nameInitial(displayName.trim() || profileDisplayName(profile));

  return (
    <form onSubmit={handleSubmit} className="space-y-6" noValidate>
      <div>
        <span className="block text-sm text-muted mb-2">Photo</span>

        <div className="flex items-center gap-4">
          {previewUrl ? (
            <img
              src={previewUrl}
              alt="New avatar preview"
              className="h-[88px] w-[88px] shrink-0 rounded-full border border-line bg-surface object-cover"
            />
          ) : (
            <ProfileAvatar src={avatarUrl} initial={initial} />
          )}

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={busy}
            className="min-h-11 px-4 py-3 rounded-lg border border-line bg-transparent text-text font-sans font-medium text-sm transition-colors duration-150 ease-out hover:bg-surface cursor-pointer disabled:opacity-60 disabled:pointer-events-none"
          >
            {profile.avatar_url || avatarBlob ? "Change photo" : "Add photo"}
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            disabled={busy}
            className="hidden"
          />
        </div>
      </div>

      {phase === "preparing" && (
        <p className="text-sm text-muted">Preparing photo...</p>
      )}

      <div>
        <label htmlFor="display_name" className={labelClass}>
          Display name
        </label>
        <input
          id="display_name"
          type="text"
          value={displayName}
          onChange={(event) => setDisplayName(event.target.value)}
          maxLength={DISPLAY_NAME_MAX_LENGTH}
          disabled={busy}
          autoComplete="name"
          placeholder="Maya"
          className={fieldClass}
        />
      </div>

      <div>
        <label htmlFor="username" className={labelClass}>
          Username
        </label>
        <input
          id="username"
          type="text"
          value={username}
          onChange={(event) =>
            setUsername(event.target.value.toLowerCase())
          }
          minLength={USERNAME_MIN_LENGTH}
          maxLength={USERNAME_MAX_LENGTH}
          pattern="[a-z0-9_]+"
          disabled={busy}
          autoComplete="off"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          placeholder="maya"
          className={fieldClass}
        />
        <p className="mt-1 text-sm text-muted">
          {USERNAME_MIN_LENGTH}–{USERNAME_MAX_LENGTH} characters: lowercase
          letters, numbers, and underscores.
        </p>
      </div>

      <div>
        <label htmlFor="bio" className={labelClass}>
          Bio
        </label>
        <textarea
          id="bio"
          value={bio}
          onChange={(event) => setBio(event.target.value)}
          rows={4}
          maxLength={BIO_MAX_LENGTH}
          disabled={busy}
          placeholder="A few words about you."
          className={`${fieldClass} resize-y min-h-[112px]`}
        />
      </div>

      {phase === "uploading" && (
        <div className="space-y-2">
          <div className="h-[2px] w-full bg-line" aria-hidden="true">
            <div
              className="h-full bg-text"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-sm text-muted">Uploading {progress}%</p>
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="rounded-lg border border-line bg-surface px-3.5 py-3 text-sm text-text"
        >
          {error}
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3">
        <button
          type="submit"
          disabled={busy}
          className="w-full sm:w-auto min-h-11 px-4 py-3 rounded-lg bg-text text-white font-sans font-medium text-sm transition-opacity duration-150 ease-out hover:opacity-90 cursor-pointer disabled:opacity-60 disabled:pointer-events-none"
        >
          {buttonLabel}
        </button>

        <Link
          href="/me"
          aria-disabled={busy}
          onClick={(event) => {
            if (busy) {
              event.preventDefault();
            }
          }}
          className={`w-full sm:w-auto text-center min-h-11 px-4 py-3 rounded-lg border border-line bg-transparent text-text font-sans font-medium text-sm transition-colors duration-150 ease-out hover:bg-surface ${
            busy ? "pointer-events-none opacity-60" : ""
          }`}
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
