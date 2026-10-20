export default function EventDetailLoading() {
  return (
    <div className="min-h-dvh bg-background text-text pb-24">
      <header className="sticky top-0 z-40 border-b border-line bg-background">
        <div className="mx-auto flex h-14 w-full max-w-[560px] items-center px-4">
          <div className="h-5 w-12 rounded bg-line/60" aria-hidden="true" />
        </div>
      </header>

      <div
        className="mx-auto w-full max-w-[560px] space-y-8 px-4 pt-6"
        aria-busy="true"
        aria-label="Loading event"
      >
        <div className="space-y-3">
          <div className="h-4 w-20 rounded bg-line/40" aria-hidden="true" />
          <div className="h-7 w-3/4 rounded bg-line/60" aria-hidden="true" />
          <div className="h-4 w-32 rounded bg-line/40" aria-hidden="true" />
        </div>

        <div className="border-t border-line" aria-hidden="true">
          {[0, 1, 2].map((index) => (
            <div
              key={index}
              className="space-y-2 border-b border-line py-4"
            >
              <div className="h-4 w-16 rounded bg-line/40" />
              <div className="h-4 w-1/2 rounded bg-line/50" />
            </div>
          ))}
        </div>

        <div className="space-y-3" aria-hidden="true">
          <div className="h-5 w-24 rounded bg-line/60" />
          <div className="grid grid-cols-3 gap-2">
            {[0, 1, 2].map((index) => (
              <div key={index} className="h-11 rounded-lg bg-line/40" />
            ))}
          </div>
        </div>

        <div className="space-y-3" aria-hidden="true">
          <div className="h-5 w-36 rounded bg-line/60" />
          <div className="h-4 w-24 rounded bg-line/40" />
        </div>
      </div>
    </div>
  );
}
