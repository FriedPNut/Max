"use client";

import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

export function ProfileBackButton() {
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={() => router.back()}
      aria-label="Back"
      className="inline-flex h-11 w-11 items-center justify-center rounded-lg text-text transition-colors duration-150 ease-out hover:bg-surface cursor-pointer"
    >
      <ArrowLeft size={24} strokeWidth={1.5} aria-hidden="true" />
    </button>
  );
}
