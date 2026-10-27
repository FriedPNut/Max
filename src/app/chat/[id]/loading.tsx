import { Skeleton } from "@/components/ui/skeleton";

/**
 * Same frame as the real room: a fixed column with a header, a scrolling
 * message area and the composer already at the bottom. The bar cannot jump
 * when the messages arrive because it never depended on their count.
 */
export default function ConversationLoading() {
  return (
    <div
      aria-busy="true"
      aria-label="Loading messages"
      className="fixed inset-0 flex h-[100dvh] flex-col overflow-hidden bg-thread"
    >
      <div
        className="flex flex-none items-center gap-2 border-b border-line px-2 pb-1.5"
        style={{ paddingTop: "max(6px, env(safe-area-inset-top, 0px))" }}
      >
        <span className="h-11 w-11" />
        <Skeleton className="h-8 w-8 rounded-full" />
        <div className="min-w-0 flex-1 space-y-1.5 px-1.5">
          <Skeleton className="h-3.5 w-32 rounded" />
          <Skeleton className="h-2.5 w-20 rounded" />
        </div>
        <span className="h-11 w-11" />
      </div>

      <div className="min-h-0 flex-1 overflow-hidden">
        <div className="flex min-h-full flex-col justify-end gap-3 px-3 pb-3">
          <Skeleton className="h-9 w-52 rounded-[22px]" />
          <Skeleton className="ml-auto h-9 w-40 rounded-[22px]" />
          <Skeleton className="h-9 w-44 rounded-[22px]" />
          <Skeleton className="ml-auto h-16 w-48 rounded-[18px]" />
        </div>
      </div>

      <div
        className="flex flex-none items-center gap-2 border-t border-line px-3 pt-2"
        style={{ paddingBottom: "max(8px, env(safe-area-inset-bottom, 0px))" }}
      >
        <Skeleton className="h-11 w-11 rounded-full" />
        <Skeleton className="h-11 flex-1 rounded-full" />
      </div>
    </div>
  );
}
