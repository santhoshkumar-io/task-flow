import { Skeleton } from "../../components/ui/Skeleton";

// The grey outline of the table while it loads.
//
// The row height is the whole point. `h-row` is the 56px token from
// index.css — the SAME token the real table row uses — so when the data lands
// nothing moves. Hardcoding 56 here would work today and drift the first time
// the row height changes; taking it from the same token means it cannot.

const ROWS = 8;

export function TaskTableSkeleton() {
  return (
    <>
      {/* Desktop: matches the six columns of the real table. */}
      <div className="hidden md:block" aria-hidden="true">
        <div className="border-b border-line px-4 py-2.5">
          <Skeleton className="h-3 w-24" />
        </div>

        {Array.from({ length: ROWS }, (_, index) => (
          <div
            key={index}
            className="h-row flex items-center gap-4 border-b border-line px-4 last:border-0"
          >
            <div className="w-[34%] space-y-1.5">
              <Skeleton className="h-3.5 w-3/4" />
              <Skeleton className="h-2.5 w-14" />
            </div>
            <Skeleton className="h-[22px] w-24 shrink-0" />
            <Skeleton className="h-3.5 w-16 shrink-0" />
            <div className="flex flex-1 items-center gap-2">
              <Skeleton className="size-6 shrink-0 rounded-full" />
              <Skeleton className="h-3.5 w-24" />
            </div>
            <Skeleton className="h-3.5 w-12 shrink-0" />
            <Skeleton className="h-3.5 w-14 shrink-0" />
          </div>
        ))}
      </div>

      {/* Mobile: the same count of card-shaped blocks. */}
      <div className="space-y-3 md:hidden" aria-hidden="true">
        {Array.from({ length: ROWS }, (_, index) => (
          <div
            key={index}
            className="space-y-3 rounded-lg border border-line bg-white p-4"
          >
            <Skeleton className="h-3.5 w-2/3" />
            <Skeleton className="h-2.5 w-28" />
            <div className="flex items-center gap-3">
              <Skeleton className="h-[22px] w-24" />
              <Skeleton className="h-3 w-14" />
              <Skeleton className="ml-auto size-6 rounded-full" />
            </div>
          </div>
        ))}
      </div>

      {/* The visible blocks are hidden from screen readers, so this is what a
          screen reader is told instead. */}
      <span className="sr-only" role="status">
        Loading tasks
      </span>
    </>
  );
}
