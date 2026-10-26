"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Avatar, Button } from "@/components/ui";
import type { EventPhoto } from "@/lib/event-photos-data";
import { useIslandHidden } from "@/lib/use-island-hidden";

export function PhotosTab({ photos, error }: { photos: EventPhoto[]; error?: string }) {
  const [selected, setSelected] = useState<EventPhoto | null>(null);
  useIslandHidden(selected !== null);

  useEffect(() => {
    if (!selected) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setSelected(null);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selected]);

  if (error) return <p role="alert" className="text-sm text-muted">{error}</p>;
  if (photos.length === 0) return <p className="text-sm text-muted">No photos for this event yet.</p>;

  return <>
    <div className="grid grid-cols-3 gap-1 border-t border-line pt-3">
      {photos.map((photo) => <button key={photo.id} type="button" onClick={() => setSelected(photo)} aria-label={`View photo by ${photo.authorName}`} className="aspect-square overflow-hidden rounded-lg bg-surface-2 focus:outline-2 focus:outline-primary"><img draggable={false} src={photo.imageUrl} alt={photo.caption || `Photo by ${photo.authorName}`} loading="lazy" className="h-full w-full object-cover" /></button>)}
    </div>
    {selected && <div role="dialog" aria-modal="true" aria-label="Event photo" data-no-swipe className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 p-4" onClick={() => setSelected(null)}>
      <div className="max-h-full w-full max-w-[560px] overflow-y-auto rounded-card border border-line bg-background" onClick={(event) => event.stopPropagation()}>
        <img draggable={false} src={selected.imageUrl} alt={selected.caption || `Photo by ${selected.authorName}`} className="max-h-[70dvh] w-full bg-surface object-contain" />
        <div className="p-4">
          <div className="flex items-center gap-3">
            <Avatar src={selected.authorAvatarUrl} initial={selected.authorInitial} size={40} />
            <div className="min-w-0">
              {selected.authorUsername ? <Link href={`/u/${encodeURIComponent(selected.authorUsername)}`} className="text-base font-semibold text-text">{selected.authorName}</Link> : <p className="text-base font-semibold text-text">{selected.authorName}</p>}
              <p className="text-sm text-muted">{selected.relativeTime}</p>
            </div>
            <Button variant="secondary" size="sm" onClick={() => setSelected(null)} className="ml-auto">Close</Button>
          </div>
          {selected.caption && <p className="mt-3 whitespace-pre-wrap break-words text-base leading-relaxed text-text">{selected.caption}</p>}
        </div>
      </div>
    </div>}
  </>;
}
