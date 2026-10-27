"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, Sheet, Toast } from "@/components/ui";

// The composer (and its image pipeline) is not needed until the sheet opens.
const PostComposer = dynamic(
  () => import("@/components/posts/post-composer").then((m) => m.PostComposer),
  { ssr: false }
);

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
  const [toast, setToast] = useState<string | null>(null);
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
            onError={setToast}
          />
        </Sheet>
      )}

      <Toast message={toast} onDone={() => setToast(null)} />
    </>
  );
}
