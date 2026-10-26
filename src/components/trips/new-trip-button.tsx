"use client";

import { Plus } from "lucide-react";
import { useState } from "react";
import { CreateTripSheet } from "@/components/trips/create-trip-sheet";

export function NewTripButton({
  friends = [],
  userId = "",
}: {
  friends?: { id: string; name: string }[];
  userId?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="New trip"
        className="fixed z-40 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-on-primary transition-[background-color,opacity,scale] duration-100 ease-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        style={{
          bottom: "calc(72px + 16px + env(safe-area-inset-bottom, 0px))",
          right: "calc(16px + env(safe-area-inset-right, 0px))",
        }}
      >
        <Plus size={24} strokeWidth={1.75} aria-hidden="true" />
      </button>
      {open && <CreateTripSheet onClose={() => setOpen(false)} friends={friends} userId={userId} />}
    </>
  );
}
