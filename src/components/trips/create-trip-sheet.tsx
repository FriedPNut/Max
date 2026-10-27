"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { createTripAction } from "@/app/actions/trips";
import { Button, Input, Sheet, Textarea } from "@/components/ui";
import {
  MAX_UPLOAD_BYTES,
  resizeImageToWidth,
  uploadPhotoWithThumbnail,
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


type FriendOption = { id: string; name: string };

export function CreateTripSheet({
  onClose,
  friends = [],
  userId = "",
  onError,
}: {
  onClose: () => void;
  friends?: FriendOption[];
  userId?: string;
  /** Reported outside the sheet, which is already gone by then. */
  onError?: (message: string) => void;
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

    // The sheet closes on this frame. The cover upload and the insert run
    // behind it, then the trip's page opens.
    const tripId = crypto.randomUUID();
    const coverBlob = cover;
    onClose();

    let coverPath: string | null = null;

    if (coverBlob) {
      try {
        const { data: { session } } = await supabase.auth.getSession();

        if (!session?.access_token) {
          onError?.("You're signed out. Refresh and try again.");
          return;
        }

        coverPath = `trips/${userId}/${tripId}.jpg`;
        await uploadPhotoWithThumbnail({
          file: coverBlob,
          bucket: TRIP_COVER_BUCKET,
          path: coverPath,
          token: session.access_token,
          onProgress: () => {},
        });
      } catch {
        onError?.("Couldn't upload that cover. Try again.");
        return;
      }
    }

    const result = await createTripAction({
      id: tripId,
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
      onError?.(result.error ?? "Couldn't create that trip. Try again.");
      return;
    }

    router.push(`/trips/${result.id}`);
  }

  return (
    <Sheet label="New trip" onClose={onClose}>
      <form onSubmit={submit} noValidate className="space-y-5 pb-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-text">New trip</h2>
          <Button variant="text" size="sm" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
        </div>

        <div>
          <label htmlFor="trip-title" className="mb-2 block text-sm text-muted">Title</label>
          <Input id="trip-title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={TRIP_TITLE_MAX} disabled={busy} placeholder="Lake week" />
        </div>

        <div>
          <label htmlFor="trip-destination" className="mb-2 block text-sm text-muted">Destination (optional)</label>
          <Input id="trip-destination" value={destination} onChange={(e) => setDestination(e.target.value)} maxLength={TRIP_DESTINATION_MAX} disabled={busy} placeholder="Lake Tahoe, CA" />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label htmlFor="trip-start" className="mb-2 block text-sm text-muted">Start</label>
            <Input id="trip-start" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} disabled={busy} />
          </div>
          <div>
            <label htmlFor="trip-end" className="mb-2 block text-sm text-muted">End</label>
            <Input id="trip-end" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} disabled={busy} />
          </div>
        </div>

        <div>
          <label htmlFor="trip-description" className="mb-2 block text-sm text-muted">Description (optional)</label>
          <Textarea id="trip-description" value={description} onChange={(e) => setDescription(e.target.value)} maxLength={TRIP_DESCRIPTION_MAX} rows={3} disabled={busy} className="resize-none" />
        </div>

        <div>
          <span className="mb-2 block text-sm text-muted">Cover photo (optional)</span>
          {coverPreview && <img draggable={false} src={coverPreview} alt="Cover preview" className="mb-3 aspect-video w-full rounded-lg border border-line object-cover" />}
          <Button variant="secondary" onClick={() => fileRef.current?.click()} disabled={busy}>
            {cover ? "Change cover" : "Choose cover"}
          </Button>
          <input ref={fileRef} type="file" accept="image/*" onChange={handleCover} className="hidden" />
        </div>

        {friends.length > 0 && (
          <fieldset>
            <legend className="mb-2 block text-sm text-muted">Add friends</legend>
            <div className="max-h-48 overflow-y-auto border-t border-line">
              {friends.map((friend) => (
                <label key={friend.id} className="flex min-h-11 items-center gap-3 border-b border-line text-base text-text">
                  <input
                    type="checkbox"
                    checked={friendIds.includes(friend.id)}
                    disabled={busy}
                    onChange={() => setFriendIds((current) => current.includes(friend.id) ? current.filter((id) => id !== friend.id) : [...current, friend.id])}
                    className="h-4 w-4 accent-primary"
                  />
                  {friend.name}
                </label>
              ))}
            </div>
          </fieldset>
        )}

        {phase === "uploading" && <p className="text-sm text-muted">Uploading cover {progress}%</p>}
        {error && <p role="alert" className="text-sm text-text">{error}</p>}

        <Button type="submit" loading={busy} disabled={busy} className="w-full">
          Create trip
        </Button>
      </form>
    </Sheet>
  );
}
