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
import {
  Avatar,
  Button,
  Textarea,
  Input,
  buttonStyles,
  Card,
} from "@/components/ui";
import { createClient } from "@/lib/supabase/client";

const AVATAR_SIZE = 400;
const JPEG_QUALITY = 0.8;

const labelClass = "block text-[13px] text-muted mb-2";

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
      <Card className="space-y-4 p-4">
        <span className="block text-[13px] text-muted">Photo</span>

        <div className="flex items-center gap-4">
          {previewUrl ? (
            <Avatar src={previewUrl} initial={initial} size={88} />
          ) : (
            <Avatar src={avatarUrl} initial={initial} size={88} />
          )}

          <Button
            variant="secondary"
            onClick={() => fileInputRef.current?.click()}
            disabled={busy}
          >
            {profile.avatar_url || avatarBlob ? "Change photo" : "Add photo"}
          </Button>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            disabled={busy}
            className="hidden"
          />
        </div>
      </Card>

      {phase === "preparing" && (
        <p className="text-sm text-muted">Preparing photo...</p>
      )}

      <Card className="space-y-5 p-4">
        <div>
          <label htmlFor="display_name" className={labelClass}>
            Display name
          </label>
          <Input
            id="display_name"
            type="text"
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            maxLength={DISPLAY_NAME_MAX_LENGTH}
            disabled={busy}
            autoComplete="name"
            placeholder="Maya"
          />
        </div>

        <div>
          <label htmlFor="username" className={labelClass}>
            Username
          </label>
          <Input
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
          <Textarea
            id="bio"
            value={bio}
            onChange={(event) => setBio(event.target.value)}
            rows={4}
            maxLength={BIO_MAX_LENGTH}
            disabled={busy}
            placeholder="A few words about you."
            className="min-h-[112px] resize-y"
          />
        </div>
      </Card>

      {phase === "uploading" && (
        <div className="space-y-2">
          <div className="h-[2px] w-full bg-surface-2" aria-hidden="true">
            <div
              className="h-full bg-primary"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-sm text-muted">Uploading {progress}%</p>
        </div>
      )}

      {error && (
        <Card role="alert" className="border-danger/30 px-4 py-3 text-sm text-danger">
          {error}
        </Card>
      )}

      <div className="flex flex-col sm:flex-row gap-3">
        <Button type="submit" disabled={busy} className="w-full sm:w-auto">
          {buttonLabel}
        </Button>

        <Link
          href="/me"
          aria-disabled={busy}
          onClick={(event) => {
            if (busy) {
              event.preventDefault();
            }
          }}
          className={buttonStyles({
            variant: "secondary",
            className: `w-full sm:w-auto ${busy ? "pointer-events-none opacity-40" : ""}`,
          })}
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
