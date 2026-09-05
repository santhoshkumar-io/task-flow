import { Button } from "../../components/ui/Button";

// TWO empty states, not one.
//
// "You have no tasks yet" and "nothing matches these filters" look similar and
// mean completely different things. Someone seeing "No tasks yet" while a
// status filter is set will believe their data is gone. The plan calls
// collapsing them into one message the most common thing that gets marked down
// on this screen, so the difference is the whole reason this file exists.

interface EmptyStateProps {
  /** True when filters are set — decides which of the two screens is shown. */
  filtered: boolean;
  onClearFilters: () => void;
  onCreate: () => void;
}

export function EmptyState({
  filtered,
  onClearFilters,
  onCreate,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center px-6 py-16 text-center">
      <span className="mb-4 inline-flex size-12 items-center justify-center rounded-full bg-surface text-muted">
        {filtered ? <Magnifier /> : <ClipboardIcon />}
      </span>

      <h2 className="text-base font-semibold text-ink">
        {filtered ? "No tasks found" : "No tasks yet"}
      </h2>

      <p className="mt-1 max-w-sm text-sm text-muted">
        {filtered
          ? "Try changing your filters or create a new task."
          : "Create your first task to get started."}
      </p>

      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        {/* Only offered when there is actually something to clear. A
            "Clear filters" button on an empty account would do nothing. */}
        {filtered && (
          <Button variant="secondary" onClick={onClearFilters}>
            Clear filters
          </Button>
        )}
        <Button onClick={onCreate}>Create Task</Button>
      </div>
    </div>
  );
}

function Magnifier() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="size-6"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="11" cy="11" r="6" />
      <path d="m20 20-4.5-4.5" />
    </svg>
  );
}

function ClipboardIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="size-6"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M9 4h6v3H9z" />
      <path d="M9 5.5H7a1 1 0 0 0-1 1V19a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V6.5a1 1 0 0 0-1-1h-2" />
      <path d="M9 12h6M9 16h4" />
    </svg>
  );
}
