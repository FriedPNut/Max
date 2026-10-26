"use client";

import { useState } from "react";
import { Button, Toast } from "@/components/ui";

function fallbackCopy(value: string) {
  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  textarea.style.pointerEvents = "none";
  document.body.appendChild(textarea);
  textarea.select();

  try {
    return document.execCommand("copy");
  } finally {
    document.body.removeChild(textarea);
  }
}

export function ProfileShareButton({
  username,
}: {
  username?: string | null;
}) {
  const [toast, setToast] = useState<string | null>(null);

  async function handleShare() {
    const url = username
      ? `${window.location.origin}/u/${encodeURIComponent(username)}`
      : window.location.href;

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
      } else if (!fallbackCopy(url)) {
        throw new Error("Copy failed");
      }

      setToast("Link copied");
    } catch {
      setToast("Couldn't copy the link");
    }
  }

  return (
    <div className="flex-1">
      <Button
        type="button"
        variant="secondary"
        onClick={handleShare}
        className="w-full"
      >
        Share profile
      </Button>

      <Toast message={toast} onDone={() => setToast(null)} />
    </div>
  );
}
