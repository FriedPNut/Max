"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { loadWrappedAction } from "@/app/actions/recap";
import { Button, Card } from "@/components/ui";
import { WrappedSkeleton } from "@/components/recap/skeletons";
import { useViewerTimeZone } from "@/components/recap/use-viewer-time-zone";
import type { WrappedYear } from "@/lib/recap";

export function WrappedView({ year }: { year: number }) {
  const timeZone = useViewerTimeZone();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [data, setData] = useState<WrappedYear | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [index, setIndex] = useState(0);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!timeZone) {
      return;
    }

    let cancelled = false;

    void loadWrappedAction(year, timeZone).then((result) => {
      if (cancelled) {
        return;
      }

      if (result.data) {
        setData(result.data);
      } else {
        setError(result.error ?? "Couldn't load your year. Refresh and try again.");
      }
    });

    return () => {
      cancelled = true;
    };
  }, [timeZone, year]);

  function handleScroll() {
    const node = scrollRef.current;

    if (!node || !data) {
      return;
    }

    const next = Math.round(node.scrollLeft / Math.max(1, node.clientWidth));
    setIndex(Math.min(data.cards.length - 1, Math.max(0, next)));
  }

  async function copyLink() {
    setError(null);

    try {
      await navigator.clipboard.writeText(
        `${window.location.origin}/wrapped/${year}`
      );
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Couldn't copy the link.");
    }
  }

  if (!data) {
    return error ? (
      <section className="space-y-6">
        <BackLink />
        <p className="text-sm text-muted">{error}</p>
      </section>
    ) : (
      <WrappedSkeleton />
    );
  }

  return (
    <section className="space-y-6">
      <div className="space-y-2">
        <BackLink />
        <h1 className="text-[22px] font-bold leading-tight text-text">
          Max Wrapped
        </h1>
        <p className="text-sm text-muted">{year}</p>
      </div>

      <div
        ref={scrollRef}
        onScroll={handleScroll}
        aria-label={`Max Wrapped ${year}`}
        className="flex snap-x snap-mandatory overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        data-no-swipe
      >
        {data.cards.map((card) => (
          <article key={card.id} className="w-full shrink-0 snap-center">
            <Card className="flex min-h-[360px] flex-col justify-center p-6">
              {card.imageUrl && (
                <img draggable={false}
                  src={card.imageUrl}
                  alt=""
                  className="mb-4 h-24 w-24 rounded-[10px] bg-surface-2 object-cover"
                />
              )}

              <p className="text-sm text-muted">{card.label}</p>
              <p className="mt-2 break-words text-[32px] font-semibold leading-tight text-text">
                {card.value}
              </p>

              {card.detail && (
                <p className="mt-2 text-sm text-muted">{card.detail}</p>
              )}

              {card.closing && (
                <Button
                  onClick={() => void copyLink()}
                  className="mt-6 w-full"
                >
                  {copied ? "Link copied" : "Share"}
                </Button>
              )}
            </Card>
          </article>
        ))}
      </div>

      <div className="flex justify-center gap-2" aria-hidden="true">
        {data.cards.map((card, dotIndex) => (
          <span
            key={card.id}
            className={`h-1.5 w-1.5 rounded-full ${
              dotIndex === index ? "bg-text" : "bg-line"
            }`}
          />
        ))}
      </div>

      {error && (
        <p role="alert" className="text-sm text-text">
          {error}
        </p>
      )}
    </section>
  );
}

function BackLink() {
  return (
    <Link
      href="/me"
      className="inline-flex min-h-11 items-center gap-1.5 text-sm text-muted transition-colors duration-200 ease-out hover:text-text"
    >
      <ArrowLeft size={24} strokeWidth={1.75} aria-hidden="true" />
      Profile
    </Link>
  );
}
