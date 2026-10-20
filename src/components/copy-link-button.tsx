"use client";

import { useEffect, useRef, useState } from "react";

type CopyState = "idle" | "copied" | "error";

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

export function CopyLinkButton() {
  const [state, setState] = useState<CopyState>("idle");
  const timer = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timer.current !== null) {
        window.clearTimeout(timer.current);
      }
    };
  }, []);

  function showTemporary(next: CopyState) {
    setState(next);

    if (timer.current !== null) {
      window.clearTimeout(timer.current);
    }

    timer.current = window.setTimeout(() => {
      setState("idle");
    }, 2_000);
  }

  async function copyLink() {
    const url = window.location.href;

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
      } else if (!fallbackCopy(url)) {
        throw new Error("Copy failed");
      }

      showTemporary("copied");
    } catch {
      showTemporary("error");
    }
  }

  const label =
    state === "copied"
      ? "Copied"
      : state === "error"
      ? "Couldn't copy"
      : "Copy link";

  return (
    <button
      type="button"
      onClick={copyLink}
      aria-live="polite"
      className="min-h-11 rounded-lg border border-line bg-transparent px-3 text-sm font-medium text-text transition-colors duration-150 ease-out hover:bg-surface cursor-pointer"
    >
      {label}
    </button>
  );
}
