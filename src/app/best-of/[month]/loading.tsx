import { BestOfResultSkeleton } from "@/components/best-of/skeletons";

export default function BestOfMonthLoading() {
  return (
    <div className="min-h-dvh bg-background text-text pb-24">
      <header className="sticky top-0 z-40 border-b border-line bg-background">
        <div className="mx-auto flex h-14 w-full max-w-[560px] items-center px-4">
          <div className="h-5 w-12 rounded bg-line/60" aria-hidden="true" />
        </div>
      </header>

      <div className="mx-auto w-full max-w-[560px] px-4 pt-6">
        <BestOfResultSkeleton />
      </div>
    </div>
  );
}
