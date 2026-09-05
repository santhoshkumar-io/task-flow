import { Card } from "../../components/ui/Card";
import { Skeleton } from "../../components/ui/Skeleton";

// The same two-column shape as the loaded screen, so nothing jumps when the
// data arrives — the same rule the table skeleton follows.

export function TaskDetailSkeleton() {
  return (
    <div aria-hidden="true">
      <Skeleton className="h-3.5 w-28" />

      <div className="mt-4 flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1 space-y-3">
          <Skeleton className="h-2.5 w-16" />
          <Skeleton className="h-7 w-2/3" />
          <div className="flex items-center gap-3">
            <Skeleton className="h-[22px] w-24" />
            <Skeleton className="h-3.5 w-16" />
            <Skeleton className="h-3 w-32" />
          </div>
        </div>
        <Skeleton className="h-10 w-28 shrink-0" />
      </div>

      <div className="mt-6 flex flex-col gap-6 lg:flex-row">
        <div className="min-w-0 flex-1 space-y-6">
          <Card padding="none">
            <div className="border-b border-line px-4 py-3">
              <Skeleton className="h-3.5 w-24" />
            </div>
            <div className="space-y-2 p-4">
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-11/12" />
              <Skeleton className="h-3 w-3/4" />
            </div>
          </Card>

          <Card padding="none">
            <div className="border-b border-line px-4 py-3">
              <Skeleton className="h-3.5 w-28" />
            </div>
            <div className="space-y-4 p-4">
              {Array.from({ length: 2 }, (_, index) => (
                <div key={index} className="flex gap-3">
                  <Skeleton className="size-8 shrink-0 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-3 w-40" />
                    <Skeleton className="h-3 w-full" />
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* 300px-ish rail, section 6. */}
        <div className="w-full shrink-0 space-y-6 lg:w-[300px]">
          {Array.from({ length: 2 }, (_, index) => (
            <Card key={index} padding="none">
              <div className="border-b border-line px-4 py-3">
                <Skeleton className="h-3.5 w-32" />
              </div>
              <div className="space-y-3 p-4">
                {Array.from({ length: 4 }, (_, row) => (
                  <div key={row} className="flex justify-between gap-4">
                    <Skeleton className="h-3 w-20" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>
      </div>

      <span className="sr-only" role="status">
        Loading task
      </span>
    </div>
  );
}
