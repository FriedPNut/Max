"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronRight, ImagePlus } from "lucide-react";
import { createPostAction } from "@/app/actions/posts";
import {
  MAX_UPLOAD_BYTES,
  resizeImageFile,
  uploadImageWithProgress,
} from "@/lib/client-image";
import { POSTS_BUCKET } from "@/lib/posts";
import { createClient } from "@/lib/supabase/client";
import { Button, buttonStyles, Textarea } from "@/components/ui";

const MAX_DIMENSION = 1600;
const JPEG_QUALITY = 0.8;

type Phase = "idle" | "preparing" | "uploading" | "posting";

type EventOption = { id: string; title: string; startsAt: string };

export function PostComposer({
  userId,
  onClose,
  onPosted,
  eventId: initialEventId = "",
  events = [],
  showSheetHeader = false,
}: {
  userId: string;
  onClose?: () => void;
  onPosted?: () => void;
  eventId?: string;
  events?: EventOption[];
  showSheetHeader?: boolean;
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
      const result = await createPostAction({
        imagePath: path,
        caption,
        eventId: eventId || null,
      });

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

  const shareLabel =
    phase === "idle"
      ? "Share"
      : phase === "preparing"
      ? "Preparing..."
      : phase === "uploading"
      ? "Uploading..."
      : "Sharing...";

  const selectedEvent = events.find((item) => item.id === eventId);

  return (
    <form
      onSubmit={handleSubmit}
      className={showSheetHeader ? "flex min-h-full flex-col" : "space-y-6"}
      noValidate
    >
      {showSheetHeader && (
        <div className="sticky top-0 z-20 -mx-4 -mt-2 grid grid-cols-[1fr_auto_1fr] items-center gap-2 border-b border-line bg-surface px-4 py-2">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="min-h-11 justify-self-start text-[15px] text-text transition-opacity duration-200 ease-out disabled:opacity-40"
          >
            Cancel
          </button>

          <h2 className="text-base font-semibold text-text">New post</h2>

          <button
            type="submit"
            disabled={!photo || busy}
            className="min-h-11 justify-self-end text-[15px] font-semibold text-primary transition-opacity duration-200 ease-out disabled:opacity-40"
          >
            {shareLabel}
          </button>
        </div>
      )}

      <div
        className={
          showSheetHeader ? "flex-1 space-y-5 pb-2" : "space-y-6"
        }
      >
        <div className="relative overflow-hidden rounded-lg bg-surface-2">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={busy}
            aria-label={previewUrl ? "Choose another photo" : "Choose photo"}
            className={`relative flex w-full items-center justify-center overflow-hidden ${
              showSheetHeader
                ? "aspect-[4/5] max-h-[46dvh]"
                : "aspect-[4/5] max-h-[360px]"
            } min-h-[220px]`}
          >
            {previewUrl ? (
              <img
                draggable={false}
                src={previewUrl}
                alt="Selected photo preview"
                className="h-full w-full object-contain"
              />
            ) : (
              <span className="flex flex-col items-center gap-2 px-6 text-center text-sm text-muted">
                <ImagePlus size={32} strokeWidth={1.5} aria-hidden="true" />
                Choose photo
              </span>
            )}
          </button>

          {previewUrl && (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={busy}
              className="absolute bottom-3 right-3 rounded-full bg-scrim/60 px-3 py-1.5 text-xs font-semibold text-on-primary disabled:opacity-40"
            >
              Change
            </button>
          )}

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

        <div className="border-t border-line">
          <Textarea
            id="caption"
            value={caption}
            onChange={(event) => setCaption(event.target.value)}
            rows={3}
            maxLength={2000}
            disabled={busy}
            placeholder="Write a caption..."
            aria-label="Caption"
            className="min-h-[88px] resize-none"
            style={{
              borderWidth: 0,
              backgroundColor: "transparent",
              paddingLeft: 0,
              paddingRight: 0,
            }}
          />
        </div>

        {events.length > 0 && (
          <div className="relative flex min-h-12 items-center justify-between gap-3 border-y border-line">
            <span className="text-base text-text">Add to event</span>

            <span className="flex min-w-0 items-center gap-1.5 text-sm text-muted">
              <span className="max-w-[220px] truncate">
                {selectedEvent?.title ?? "No event"}
              </span>
              <ChevronRight
                size={18}
                strokeWidth={1.75}
                aria-hidden="true"
              />
            </span>

            <select
              id="post-event"
              value={eventId}
              onChange={(event) => setEventId(event.target.value)}
              disabled={busy}
              aria-label="Add to event"
              className="absolute inset-0 h-full w-full cursor-pointer appearance-none opacity-0"
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

        {phase === "uploading" && (
          <div className="space-y-2">
            <div className="h-[2px] w-full bg-line" aria-hidden="true">
              <div
                className="h-full bg-primary"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-sm text-muted">Uploading {progress}%</p>
          </div>
        )}

        {error && (
          <p
            role="alert"
            className="rounded-lg bg-surface-2 px-3.5 py-3 text-sm text-text"
          >
            {error}
          </p>
        )}

        {!showSheetHeader && (
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button
              type="submit"
              disabled={!photo || busy}
              className="w-full sm:w-auto"
            >
              {buttonLabel}
            </Button>

            {onClose ? (
              <Button
                variant="secondary"
                onClick={onClose}
                disabled={busy}
                className="w-full sm:w-auto"
              >
                Cancel
              </Button>
            ) : (
              <Link
                href="/feed"
                aria-disabled={busy}
                onClick={(event) => {
                  if (busy) {
                    event.preventDefault();
                  }
                }}
                className={`${buttonStyles({
                  variant: "secondary",
                })} w-full text-center sm:w-auto ${
                  busy ? "pointer-events-none opacity-40" : ""
                }`}
              >
                Cancel
              </Link>
            )}
          </div>
        )}
      </div>
    </form>
  );
}
