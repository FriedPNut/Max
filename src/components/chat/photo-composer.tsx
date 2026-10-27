"use client";

import { ImagePlus, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { sendPhotoMessageAction } from "@/app/actions/chat-messages";
import { Button, Card, Input } from "@/components/ui";
import {
  MAX_UPLOAD_BYTES,
  resizeImageToWidth,
  uploadPhotoWithThumbnail,
  extensionFor,
} from "@/lib/client-image";
import { CHAT_BUCKET, type MessageRecord } from "@/lib/chat";
import { createClient } from "@/lib/supabase/client";

const MAX_DIMENSION = 1600;
const JPEG_QUALITY = 0.8;

export function PhotoComposer({
  conversationId,
  userId,
  onOptimistic,
  onSent,
  onFailed,
  onError,
}: {
  conversationId: string;
  userId: string;
  /** Shows the local preview immediately and hands back the save-and-upload job. */
  onOptimistic: (
    message: MessageRecord,
    previewUrl: string,
    retry: () => Promise<void>
  ) => void;
  onSent: (message: MessageRecord) => void;
  onFailed: (messageId: string) => void;
  onError: (message: string) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const previewRef = useRef<string | null>(null);
  const [photo, setPhoto] = useState<Blob | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [preparing, setPreparing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [localError, setLocalError] = useState<string | null>(null);

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

    if (!file) return;

    setLocalError(null);

    if (file.type && !file.type.startsWith("image/")) {
      setLocalError("Pick a photo.");
      return;
    }

    if (file.size > MAX_UPLOAD_BYTES) {
      setLocalError("That photo is too big. Pick one under 30 MB.");
      return;
    }

    setPreparing(true);

    try {
      const resized = await resizeImageToWidth(file, MAX_DIMENSION, JPEG_QUALITY);

      if (previewRef.current) URL.revokeObjectURL(previewRef.current);
      const url = URL.createObjectURL(resized);
      previewRef.current = url;
      setPreview(url);
      setPhoto(resized);
    } catch {
      // Canvas can't decode some formats (e.g. HEIC). Send the original bytes.
      if (previewRef.current) URL.revokeObjectURL(previewRef.current);
      const url = URL.createObjectURL(file);
      previewRef.current = url;
      setPreview(url);
      setPhoto(file);
    } finally {
      setPreparing(false);
    }
  }

  function send() {
    if (!photo) return;

    const blob = photo;
    const messageId = crypto.randomUUID();
    const extension = extensionFor(blob.type);
    const path = `chat/${userId}/${messageId}.${extension}`;
    const text = caption.trim();
    const previewUrl = previewRef.current;
    // The preview now belongs to the outgoing bubble, so clear() must not
    // revoke it.
    previewRef.current = null;

    const optimistic: MessageRecord = {
      id: messageId,
      conversation_id: conversationId,
      user_id: userId,
      body: text || null,
      created_at: new Date().toISOString(),
      image_path: path,
      edited_at: null,
      deleted_at: null,
      mentions: [],
    };

    const save = async () => {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        onError("You're signed out. Refresh and try again.");
        onFailed(messageId);
        return;
      }

      try {
        await uploadPhotoWithThumbnail({
          file: blob,
          bucket: CHAT_BUCKET,
          path,
          contentType: blob.type || "image/jpeg",
          token: session.access_token,
          onProgress: setProgress,
        });
      } catch {
        onFailed(messageId);
        return;
      }

      const result = await sendPhotoMessageAction({
        id: messageId,
        conversationId,
        imagePath: path,
        caption: text,
      });

      if (result.error || !result.message) {
        onFailed(messageId);
        return;
      }

      onSent(result.message);
    };

    // Bubble, preview, and cleared composer all happen before the upload.
    onOptimistic(optimistic, previewUrl ?? "", save);
    clear();
    setLocalError(null);
    void save();
  }

  if (!preview) {
    return (
      <>
        <button
          type="button"
          aria-label="Send a photo"
          onClick={() => fileRef.current?.click()}
          className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-text transition-[background-color,opacity] duration-100 ease-out hover:bg-surface-2"
        >
          <ImagePlus size={24} strokeWidth={1.75} aria-hidden="true" />
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          onChange={handleFile}
          className="hidden"
        />
        {localError && (
          <p role="alert" className="text-sm text-text">
            {localError}
          </p>
        )}
      </>
    );
  }

  return (
    <Card className="w-full space-y-2 p-3">
      <div className="flex items-start justify-between gap-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          draggable={false}
          src={preview}
          alt="Photo to send"
          className="max-h-48 rounded-lg object-contain"
        />
        <button
          type="button"
          aria-label="Remove photo"
          onClick={clear}
          className="inline-flex h-11 w-11 items-center justify-center rounded-full text-muted transition-colors duration-100 ease-out hover:text-text"
        >
          <X size={24} strokeWidth={1.75} aria-hidden="true" />
        </button>
      </div>
      <Input
        type="text"
        value={caption}
        onChange={(event) => setCaption(event.target.value)}
        maxLength={2000}
        placeholder="Add a caption (optional)"
        aria-label="Caption"
        className="px-3 py-2"
      />
      {progress > 0 && progress < 100 && (
        <p className="text-sm text-muted">Uploading {progress}%</p>
      )}
      {localError && (
        <p role="alert" className="text-sm text-text">
          {localError}
        </p>
      )}
      <Button onClick={send} className="w-full">
        {preparing ? "Preparing photo…" : "Send photo"}
      </Button>
    </Card>
  );
}
