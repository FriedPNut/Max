"use client";

import { useRouter } from "next/navigation";
import { BackIcon } from "@/components/icons";

export function ProfileBackButton() {
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={() => router.back()}
      aria-label="Back"
      className="inline-flex h-11 w-11 items-center justify-center rounded-lg text-text transition-colors duration-200 ease-out hover:bg-surface-2"
    >
      <BackIcon size={24} strokeWidth={1.75} aria-hidden="true" />
    </button>
  );
}
