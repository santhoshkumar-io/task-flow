import { Button } from "../../components/ui/Button";
import { cn } from "../../lib/cn";
import type { TaskPage } from "../../types";

// "Showing 1–10 of 42 tasks" on the left, page buttons on the right with the
// current page filled black — section 4.
//
// Every number here is arithmetic on `page`, `limit` and `total` from the API
// response. None of them is counted from what happens to be on screen, which
// would go wrong the moment the last page is short.

interface PaginationProps {
  page: TaskPage;
  onPageChange: (page: number) => void;
  /** Mobile "Load more" — appends instead of replacing. */
  onLoadMore: () => void;
  /** How many rows are on screen now; on mobile that is several pages' worth. */
  shownCount: number;
  loadingMore?: boolean;
}

export function Pagination({
  page,
  onPageChange,
  onLoadMore,
  shownCount,
  loadingMore,
}: PaginationProps) {
  const from = page.total === 0 ? 0 : (page.page - 1) * page.limit + 1;
  const to = from + page.items.length - 1;

  return (
    <div className="flex flex-col gap-4 border-t border-line px-4 py-3 md:flex-row md:items-center md:justify-between">
      {/* The desktop count describes the page; the mobile one describes the
          accumulated stack, because Load more keeps what was already there. */}
      <p className="text-xs text-muted">
        <span className="hidden md:inline">
          Showing {from}–{to} of {page.total}{" "}
          {page.total === 1 ? "task" : "tasks"}
        </span>
        <span className="md:hidden">
          Showing {shownCount} of {page.total}{" "}
          {page.total === 1 ? "task" : "tasks"}
        </span>
      </p>

      {/* Desktop: numbered pages. */}
      <nav
        aria-label="Pagination"
        className="hidden items-center gap-1 md:flex"
      >
        <PageButton
          onClick={() => onPageChange(page.page - 1)}
          disabled={page.page <= 1}
          label="Previous page"
        >
          ‹ Previous
        </PageButton>

        {pageNumbers(page.page, page.totalPages).map((entry, index) =>
          entry === "gap" ? (
            <span
              key={`gap-${index}`}
              aria-hidden="true"
              className="px-1 text-xs text-muted"
            >
              …
            </span>
          ) : (
            <PageButton
              key={entry}
              onClick={() => onPageChange(entry)}
              current={entry === page.page}
              label={`Page ${entry}`}
            >
              {entry}
            </PageButton>
          ),
        )}

        <PageButton
          onClick={() => onPageChange(page.page + 1)}
          disabled={page.page >= page.totalPages}
          label="Next page"
        >
          Next ›
        </PageButton>
      </nav>

      {/* Mobile: a full-width Load more, hidden once there is no more. */}
      {page.hasMore && (
        <Button
          variant="secondary"
          fullWidth
          onClick={onLoadMore}
          loading={loadingMore}
          className="md:hidden"
        >
          Load more
        </Button>
      )}
    </div>
  );
}

function PageButton({
  children,
  onClick,
  disabled,
  current,
  label,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  current?: boolean;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      // Tells a screen reader which page it is on. "current" is not the same
      // as "this button is selected" — it is the standard way to say it.
      aria-current={current ? "page" : undefined}
      className={cn(
        "inline-flex h-8 min-w-8 items-center justify-center rounded-md px-2 text-xs font-medium",
        "disabled:cursor-not-allowed disabled:opacity-40",
        current
          ? "bg-ink text-white"
          : "border border-line bg-white text-ink hover:bg-surface",
      )}
    >
      {children}
    </button>
  );
}

/**
 * The design draws `‹ Previous [1] 2 3 … 5 Next ›` — first, last, and a window
 * around the current page, with a gap where numbers were left out.
 *
 * Listing every page would be fine at 5 and unusable at 200.
 */
function pageNumbers(current: number, total: number): (number | "gap")[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, index) => index + 1);
  }

  const window = new Set<number>([
    1,
    total,
    current,
    current - 1,
    current + 1,
  ]);

  const pages = [...window]
    .filter((page) => page >= 1 && page <= total)
    .sort((a, b) => a - b);

  const result: (number | "gap")[] = [];
  let previous = 0;

  for (const page of pages) {
    if (page - previous > 1) result.push("gap");
    result.push(page);
    previous = page;
  }

  return result;
}
