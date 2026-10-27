import { Skeleton } from "@/components/ui/skeleton";

export default function LoginLoading() {
  return (
    <main
      aria-busy="true"
      aria-label="Loading login"
      className="flex min-h-dvh flex-col items-center justify-center bg-background px-6 py-10 text-text"
    >
      <Skeleton className="h-[64px] w-40 rounded" />
      <Skeleton className="mt-4 h-4 w-72 rounded" />
      <div className="mt-8 w-full max-w-[360px] space-y-3">
        <Skeleton className="h-11 rounded-lg" />
        <Skeleton className="h-11 rounded-lg" />
        <Skeleton className="h-11 rounded-lg" />
      </div>
    </main>
  );
}
