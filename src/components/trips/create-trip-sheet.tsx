"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { createTripAction } from "@/app/actions/trips";
import {
  MAX_UPLOAD_BYTES,
  resizeImageToWidth,
  uploadImageWithProgress,
} from "@/lib/client-image";
import { createClient } from "@/lib/supabase/client";
import {
  TRIP_DESCRIPTION_MAX,
  TRIP_DESTINATION_MAX,
  TRIP_TITLE_MAX,
} from "@/lib/trips";

export const TRIP_COVER_BUCKET = "photos";
const COVER_WIDTH = 1600;
const JPEG_QUALITY = 0.8;

const fieldClass =
  "w-full bg-surface text-text placeholder:text-muted border border-border rounded-lg px-3 py-3 text-base leading-snug focus:outline-2 focus:outline-offset-0 focus:outline-text [color-scheme:light]";
const labelClass = "mb-2 block text-sm text-muted";

type FriendOption = { id: string; name: string };

export function CreateTripSheet({
  onClose,
  friends = [],
  userId = "",
}: {
  onClose: () => void;
  friends?: FriendOption[];
  userId?: string;
}) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [title, setTitle] = useState("");
  const [destination, setDestination] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [description, setDescription] = useState("");
  const [friendIds, setFriendIds] = useState<string[]>([]);
  const [cover, setCover] = useState<Blob | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const previewRef = useRef<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [phase, setPhase] = useState<"idle" | "preparing" | "uploading" | "saving">("idle");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const busy = phase !== "idle";

  useEffect(() => {
    return () => {
      if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    };
  }, []);

  async function handleCover(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file || busy) return;

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

    try {
      const resized = await resizeImageToWidth(file, COVER_WIDTH, JPEG_QUALITY);

      if (previewRef.current) URL.revokeObjectURL(previewRef.current);
      const url = URL.createObjectURL(resized);
      previewRef.current = url;
      setCoverPreview(url);
      setCover(resized);
    } catch {
      setError("Couldn't read that photo. Try another one.");
    } finally {
      setPhase("idle");
    }
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (busy) return;

    const cleanTitle = title.trim();

    if (!cleanTitle) {
      setError("Give the trip a name.");
      return;
    }

    if (cleanTitle.length > TRIP_TITLE_MAX) {
      setError(`Keep the name under ${TRIP_TITLE_MAX} characters.`);
      return;
    }

    if (!startDate || !endDate) {
      setError("Pick a start and end date.");
      return;
    }

    if (endDate < startDate) {
      setError("The trip can't end before it starts.");
      return;
    }

    if (destination.trim().length > TRIP_DESTINATION_MAX || description.trim().length > TRIP_DESCRIPTION_MAX) {
      setError("One of those fields is too long.");
      return;
    }

    setError(null);
    let coverPath: string | null = null;

    if (cover) {
      setPhase("uploading");
      setProgress(0);

      try {
        const { data: { session } } = await supabase.auth.getSession();

        if (!session?.access_token) {
          setError("You're signed out. Refresh and try again.");
          setPhase("idle");
          return;
        }

        coverPath = `trips/${userId}/${Date.now()}.jpg`;
        await uploadImageWithProgress({
          file: cover,
          bucket: TRIP_COVER_BUCKET,
          path: coverPath,
          token: session.access_token,
          onProgress: setProgress,
        });
      } catch {
        setError("Couldn't upload that cover. Try again.");
        setPhase("idle");
        return;
      }
    }

    setPhase("saving");
    const result = await createTripAction({
      title: cleanTitle,
      destination,
      startDate,
      endDate,
      description,
      coverPath,
      friendIds,
    });

    if (result.error || !result.id) {
      if (coverPath) {
        await supabase.storage.from(TRIP_COVER_BUCKET).remove([coverPath]);
      }
      setError(result.error ?? "Couldn't create that trip. Try again.");
      setPhase("idle");
      return;
    }

    onClose();
    router.push(`/trips/${result.id}`);
  }

  return (
    <div role="dialog" aria-modal="true" aria-label="New trip" className="fixed inset-0 z-50 flex items-end justify-center bg-scrim/40" onClick={onClose}>
      <form onSubmit={submit} onClick={(event) => event.stopPropagation()} noValidate className="max-h-[90dvh] w-full max-w-[560px] space-y-5 overflow-y-auto rounded-t-lg border-t border-border bg-background p-4 pb-8">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-text">New trip</h2>
          <button type="button" onClick={onClose} disabled={busy} className="min-h-11 px-3 text-sm text-muted hover:text-text cursor-pointer disabled:opacity-60">Cancel</button>
        </div>

        <div>
          <label htmlFor="trip-title" className={labelClass}>Title</label>
          <input id="trip-title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={TRIP_TITLE_MAX} disabled={busy} placeholder="Lake week" className={fieldClass} />
        </div>

        <div>
          <label htmlFor="trip-destination" className={labelClass}>Destination (optional)</label>
          <input id="trip-destination" value={destination} onChange={(e) => setDestination(e.target.value)} maxLength={TRIP_DESTINATION_MAX} disabled={busy} placeholder="Lake Tahoe, CA" className={fieldClass} />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label htmlFor="trip-start" className={labelClass}>Start</label>
            <input id="trip-start" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} disabled={busy} className={fieldClass} />
          </div>
          <div>
            <label htmlFor="trip-end" className={labelClass}>End</label>
            <input id="trip-end" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} disabled={busy} className={fieldClass} />
          </div>
        </div>

        <div>
          <label htmlFor="trip-description" className={labelClass}>Description (optional)</label>
          <textarea id="trip-description" value={description} onChange={(e) => setDescription(e.target.value)} maxLength={TRIP_DESCRIPTION_MAX} rows={3} disabled={busy} className={`${fieldClass} resize-none`} />
        </div>

        <div>
          <span className={labelClass}>Cover photo (optional)</span>
          {coverPreview && <img draggable={false} src={coverPreview} alt="Cover preview" className="mb-3 aspect-video w-full rounded-lg border border-border object-cover" />}
          <button type="button" onClick={() => fileRef.current?.click()} disabled={busy} className="min-h-11 rounded-lg border border-border px-4 py-3 text-sm text-text hover:bg-surface cursor-pointer disabled:opacity-60">
            {cover ? "Change cover" : "Choose cover"}
          </button>
          <input ref={fileRef} type="file" accept="image/*" onChange={handleCover} className="hidden" />
        </div>

        {friends.length > 0 && (
          <fieldset>
            <legend className={labelClass}>Add friends</legend>
            <div className="max-h-48 overflow-y-auto border-t border-line">
              {friends.map((friend) => (
                <label key={friend.id} className="flex min-h-11 items-center gap-3 border-b border-line text-sm text-text">
                  <input
                    type="checkbox"
                    checked={friendIds.includes(friend.id)}
                    disabled={busy}
                    onChange={() => setFriendIds((current) => current.includes(friend.id) ? current.filter((id) => id !== friend.id) : [...current, friend.id])}
                    className="h-4 w-4 accent-text"
                  />
                  {friend.name}
                </label>
              ))}
            </div>
          </fieldset>
        )}

        {phase === "uploading" && <p className="text-sm text-muted">Uploading cover {progress}%</p>}
        {error && <p role="alert" className="text-sm text-text">{error}</p>}

        <button type="submit" disabled={busy} className="min-h-11 w-full rounded-lg bg-text px-4 py-3 text-sm font-medium text-background cursor-pointer disabled:opacity-60">
          {phase === "preparing" ? "Preparing..." : phase === "uploading" ? "Uploading..." : phase === "saving" ? "Creating..." : "Create trip"}
        </button>
      </form>
    </div>
  );
}
