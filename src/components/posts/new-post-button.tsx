"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { PostComposer } from "@/components/posts/post-composer";
import { Button, Sheet } from "@/components/ui";

type EventOption = { id: string; title: string; startsAt: string };

export function NewPostButton({
  userId,
  eventId = "",
  events = [],
  buttonLabel = "New post",
}: {
  userId: string;
  eventId?: string;
  events?: EventOption[];
  buttonLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  return (
    <>
      <Button onClick={() => setOpen(true)} className="shrink-0">
        {buttonLabel}
      </Button>

      {open && (
        <Sheet
          label="New post"
          onClose={() => setOpen(false)}
          fullHeight
        >
          <PostComposer
            userId={userId}
            eventId={eventId}
            events={events}
            showSheetHeader
            onClose={() => setOpen(false)}
            onPosted={() => {
              setOpen(false);
              router.refresh();
            }}
          />
        </Sheet>
      )}
    </>
  );
}
