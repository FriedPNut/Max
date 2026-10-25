export default function IdeasLoading() {
  return (
    <div className="min-h-dvh bg-background text-text pb-24">
      <header className="sticky top-0 z-40 border-b border-line bg-background">
        <div className="mx-auto flex h-14 w-full max-w-[560px] items-center px-4">
          <div className="h-5 w-12 rounded bg-line/60" aria-hidden="true" />
        </div>
      </header>

      <div
        className="mx-auto w-full max-w-[560px] space-y-6 px-4 pt-6"
        aria-busy="true"
        aria-label="Loading ideas"
      >
        <div className="flex items-center gap-2" aria-hidden="true">
          <div className="h-11 w-11 rounded-lg bg-line/40" />
          <div className="h-7 w-20 rounded bg-line/60" />
        </div>

        <div className="grid grid-cols-2 gap-1 rounded-lg border border-border bg-surface p-1" aria-hidden="true">
          {[0, 1].map((index) => (
            <div key={index} className="h-11 rounded-lg bg-line/40" />
          ))}
        </div>

        <div className="border-t border-line" aria-hidden="true">
          {[0, 1, 2, 3].map((index) => (
            <div
              key={index}
              className="flex items-start justify-between gap-3 border-b border-line py-4"
            >
              <div className="min-w-0 flex-1 space-y-2">
                <div className="h-4 w-2/3 rounded bg-line/50" />
                <div className="h-4 w-1/3 rounded bg-line/40" />
              </div>
              <div className="h-11 w-14 rounded-lg bg-line/40" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
