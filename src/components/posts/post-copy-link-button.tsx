"use client";

import { Link2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Toast } from "@/components/ui";
import { copyToClipboard } from "@/lib/clipboard";

export function PostCopyLinkButton({ postId }: { postId: string }) {
  const [toast, setToast] = useState<string | null>(null);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timer.current !== null) {
        window.clearTimeout(timer.current);
      }
    };
  }, []);

  async function handleCopy() {
    const url = `${window.location.origin}/feed/${postId}`;
    const copied = await copyToClipboard(url);

    setToast(copied ? "Link copied" : "Couldn't copy the link");

    if (timer.current !== null) {
      window.clearTimeout(timer.current);
    }

    timer.current = window.setTimeout(() => setToast(null), 2_000);
  }

  return (
    <>
      <button
        type="button"
        onClick={handleCopy}
        aria-label="Copy link to post"
        className="inline-flex min-h-11 min-w-11 items-center justify-center text-text transition-opacity duration-200 ease-out hover:opacity-70"
      >
        <Link2 size={24} strokeWidth={1.75} aria-hidden="true" />
      </button>

      <Toast message={toast} onDone={() => setToast(null)} />
    </>
  );
}
