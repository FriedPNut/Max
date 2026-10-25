"use client";

import { ImagePlus, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { sendPhotoMessageAction } from "@/app/actions/chat-messages";
import {
  MAX_UPLOAD_BYTES,
  resizeImageToWidth,
  uploadImageWithProgress,
} from "@/lib/client-image";
import { CHAT_BUCKET, type MessageRecord } from "@/lib/chat";
import { createClient } from "@/lib/supabase/client";

const MAX_DIMENSION = 1600;
const JPEG_QUALITY = 0.8;

export function PhotoComposer({
  conversationId,
  userId,
  onSent,
  onError,
}: {
  conversationId: string;
  userId: string;
  onSent: (message: MessageRecord) => void;
  onError: (message: string) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const previewRef = useRef<string | null>(null);
  const [photo, setPhoto] = useState<Blob | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [phase, setPhase] = useState<"idle" | "preparing" | "uploading" | "sending">("idle");
  const [progress, setProgress] = useState(0);
  const [localError, setLocalError] = useState<string | null>(null);
  const busy = phase !== "idle";

  useEffect(() => {
    return () => {
      if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    };
  }, []);

  function clear() {
    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    previewRef.current = null;
    setPreview(null);
    setPhoto(null);
    setCaption("");
    setProgress(0);
  }

  async function handleFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file || busy) return;

    setLocalError(null);

    if (file.type && !file.type.startsWith("image/")) {
      setLocalError("Pick a photo.");
      return;
    }

    if (file.size > MAX_UPLOAD_BYTES) {
      setLocalError("That photo is too big. Pick one under 30 MB.");
      return;
    }

    setPhase("preparing");

    try {
      const resized = await resizeImageToWidth(file, MAX_DIMENSION, JPEG_QUALITY);

      if (previewRef.current) URL.revokeObjectURL(previewRef.current);
      const url = URL.createObjectURL(resized);
      previewRef.current = url;
      setPreview(url);
      setPhoto(resized);
    } catch {
      setLocalError("Couldn't read that photo. Try another one.");
    } finally {
      setPhase("idle");
    }
  }

  async function send() {
    if (!photo || busy) return;

    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();

    if (!session?.access_token) {
      setLocalError("You're signed out. Refresh and try again.");
      return;
    }

    const path = `chat/${userId}/${Date.now()}.jpg`;
    setLocalError(null);
    setPhase("uploading");

    try {
      await uploadImageWithProgress({
        file: photo,
        bucket: CHAT_BUCKET,
        path,
        token: session.access_token,
        onProgress: setProgress,
      });
    } catch {
      setLocalError("Couldn't upload that photo. Try again.");
      setPhase("idle");
      return;
    }

    setPhase("sending");
    const result = await sendPhotoMessageAction({
      conversationId,
      imagePath: path,
      caption,
    });

    if (result.error || !result.message) {
      setLocalError(result.error ?? "Couldn't send that photo. Try again.");
      setPhase("idle");
      return;
    }

    onSent(result.message);
    clear();
    setPhase("idle");
  }

  if (!preview) {
    return (
      <>
        <button
          type="button"
          aria-label="Send a photo"
          disabled={busy}
          onClick={() => fileRef.current?.click()}
          className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-text transition-colors duration-150 ease-out hover:bg-surface cursor-pointer disabled:opacity-60"
        >
          <ImagePlus size={20} strokeWidth={1.5} aria-hidden="true" />
        </button>
        <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} className="hidden" />
        {localError && <p role="alert" className="text-sm text-text">{localError}</p>}
      </>
    );
  }

  return (
    <div className="w-full space-y-2 rounded-lg border border-border bg-surface p-3">
      <div className="flex items-start justify-between gap-2">
        <img src={preview} alt="Photo to send" className="max-h-48 rounded-lg object-contain" />
        <button type="button" aria-label="Remove photo" onClick={clear} disabled={busy} className="inline-flex h-11 w-11 items-center justify-center text-muted hover:text-text cursor-pointer">
          <X size={20} strokeWidth={1.5} aria-hidden="true" />
        </button>
      </div>
      <input
        type="text"
        value={caption}
        onChange={(event) => setCaption(event.target.value)}
        maxLength={2000}
        disabled={busy}
        placeholder="Add a caption (optional)"
        aria-label="Caption"
        className="w-full bg-background text-text placeholder:text-muted border border-border rounded-lg px-3 py-2 text-base focus:outline-2 focus:outline-text"
      />
      {phase === "uploading" && <p className="text-sm text-muted">Uploading {progress}%</p>}
      {localError && <p role="alert" className="text-sm text-text">{localError}</p>}
      <button type="button" onClick={() => void send()} disabled={busy} className="min-h-11 w-full rounded-lg bg-text px-4 py-3 text-sm font-medium text-background cursor-pointer disabled:opacity-60">
        {phase === "uploading" ? "Uploading..." : phase === "sending" ? "Sending..." : "Send photo"}
      </button>
    </div>
  );
}
