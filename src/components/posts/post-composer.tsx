"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPostAction } from "@/app/actions/posts";
import {
  MAX_UPLOAD_BYTES,
  resizeImageFile,
  uploadImageWithProgress,
} from "@/lib/client-image";
import { POSTS_BUCKET } from "@/lib/posts";
import { createClient } from "@/lib/supabase/client";

const MAX_DIMENSION = 1600;
const JPEG_QUALITY = 0.8;

const fieldClass =
  "w-full bg-surface text-text placeholder:text-muted border border-border rounded-lg px-3 py-3 text-base leading-snug focus:outline-2 focus:outline-offset-0 focus:outline-text";

const labelClass = "block text-sm text-muted mb-2";

type Phase = "idle" | "preparing" | "uploading" | "posting";

type EventOption = { id: string; title: string; startsAt: string };

export function PostComposer({
  userId,
  onClose,
  onPosted,
  eventId: initialEventId = "",
  events = [],
}: {
  userId: string;
  onClose?: () => void;
  onPosted?: () => void;
  eventId?: string;
  events?: EventOption[];
}) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [photo, setPhoto] = useState<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const previewRef = useRef<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [caption, setCaption] = useState("");
  const [eventId, setEventId] = useState(initialEventId);
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
    setPhoto(blob);
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
      const resized = await resizeImageFile(
        file,
        MAX_DIMENSION,
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

    if (!photo) {
      setError("Pick a photo first.");
      return;
    }

    setError(null);
    setPhase("uploading");
    setProgress(0);

    const path = `posts/${userId}/${Date.now()}.jpg`;

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        setError("You're signed out. Refresh and try again.");
        setPhase("idle");
        return;
      }

      await uploadImageWithProgress({
        file: photo,
        bucket: POSTS_BUCKET,
        path,
        token: session.access_token,
        onProgress: setProgress,
      });
    } catch {
      setError("Couldn't upload that photo. Try again.");
      setPhase("idle");
      setProgress(0);
      return;
    }

    setPhase("posting");

    try {
      const result = await createPostAction({ imagePath: path, caption, eventId: eventId || null });

      if (result.error) {
        await supabase.storage.from(POSTS_BUCKET).remove([path]);
        setError(result.error);
        setPhase("idle");
        setProgress(0);
        return;
      }

      if (onPosted) {
        onPosted();
        return;
      }

      router.replace("/feed");
    } catch {
      setError("Couldn't share that post. Try again.");
      setPhase("idle");
      setProgress(0);
    }
  }

  const buttonLabel =
    phase === "preparing"
      ? "Preparing..."
      : phase === "uploading"
      ? "Uploading..."
      : phase === "posting"
      ? "Posting..."
      : "Post";

  return (
    <form onSubmit={handleSubmit} className="space-y-6" noValidate>
      <div>
        <span className="block text-sm text-muted mb-2">Photo</span>

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={busy}
          className="inline-flex min-h-11 items-center rounded-lg border border-border bg-transparent px-4 py-3 text-sm font-medium text-text transition-colors duration-150 ease-out hover:bg-surface cursor-pointer disabled:opacity-60 disabled:pointer-events-none"
        >
          {previewUrl ? "Choose another photo" : "Choose photo"}
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

      {phase === "preparing" && (
        <p className="text-sm text-muted">Preparing photo...</p>
      )}

      {previewUrl && (
        <img draggable={false}
          src={previewUrl}
          alt="Selected photo preview"
          className="w-full max-h-[360px] object-contain rounded-lg bg-surface"
        />
      )}

      {events.length > 0 && (
        <div>
          <label htmlFor="post-event" className={labelClass}>
            Add to event
          </label>
          <select
            id="post-event"
            value={eventId}
            onChange={(event) => setEventId(event.target.value)}
            disabled={busy}
            className={fieldClass}
          >
            <option value="">No event</option>
            {events.map((item) => (
              <option key={item.id} value={item.id}>
                {item.title}
              </option>
            ))}
          </select>
        </div>
      )}

      <div>
        <label htmlFor="caption" className={labelClass}>
          Caption (optional)
        </label>
        <textarea
          id="caption"
          value={caption}
          onChange={(event) => setCaption(event.target.value)}
          rows={4}
          maxLength={2000}
          disabled={busy}
          placeholder="Say something about this photo."
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
          className="rounded-lg border border-border bg-surface px-3.5 py-3 text-sm text-text"
        >
          {error}
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3">
        <button
          type="submit"
          disabled={!photo || busy}
          className="w-full sm:w-auto min-h-11 px-4 py-3 rounded-lg bg-text text-background font-sans font-medium text-sm transition-opacity duration-150 ease-out hover:opacity-90 cursor-pointer disabled:opacity-60 disabled:pointer-events-none"
        >
          {buttonLabel}
        </button>

        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="w-full sm:w-auto min-h-11 px-4 py-3 rounded-lg border border-border bg-transparent text-text font-sans font-medium text-sm transition-colors duration-150 ease-out hover:bg-surface cursor-pointer disabled:opacity-60 disabled:pointer-events-none"
          >
            Cancel
          </button>
        ) : (
          <Link
            href="/feed"
            aria-disabled={busy}
            onClick={(event) => {
              if (busy) {
                event.preventDefault();
              }
            }}
            className={`w-full sm:w-auto text-center min-h-11 px-4 py-3 rounded-lg border border-border bg-transparent text-text font-sans font-medium text-sm transition-colors duration-150 ease-out hover:bg-surface ${
              busy ? "pointer-events-none opacity-60" : ""
            }`}
          >
            Cancel
          </Link>
        )}
      </div>
    </form>
  );
}
