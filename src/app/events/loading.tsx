export default function EventsLoading() {
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
        aria-label="Loading events"
      >
        <section className="overflow-hidden rounded-lg border border-line bg-surface">
          <div className="flex items-center justify-between px-4 py-3">
            <div className="h-5 w-16 rounded bg-line/60" aria-hidden="true" />
            <div className="h-4 w-16 rounded bg-line/40" aria-hidden="true" />
          </div>

          {[0, 1, 2].map((index) => (
            <div
              key={index}
              className="flex items-start justify-between gap-3 border-t border-line px-4 py-3"
            >
              <div className="min-w-0 flex-1 space-y-2">
                <div
                  className="h-4 w-2/3 rounded bg-line/50"
                  aria-hidden="true"
                />
                <div
                  className="h-4 w-1/2 rounded bg-line/40"
                  aria-hidden="true"
                />
              </div>
              <div
                className="h-9 w-12 rounded-lg bg-line/40"
                aria-hidden="true"
              />
            </div>
          ))}
        </section>

        <section className="space-y-4">
          <div
            className="grid grid-cols-3 gap-1 rounded-lg border border-line bg-surface p-1"
            aria-hidden="true"
          >
            {[0, 1, 2].map((index) => (
              <div key={index} className="h-11 rounded-lg bg-line/40" />
            ))}
          </div>

          <div className="flex items-center gap-2" aria-hidden="true">
            <div className="h-6 flex-1 rounded bg-line/50" />
            <div className="h-11 w-16 rounded-lg bg-line/40" />
          </div>

          <div className="grid grid-cols-7 gap-1" aria-hidden="true">
            {Array.from({ length: 42 }, (_, index) => (
              <div key={index} className="h-11 rounded-lg bg-line/30" />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
