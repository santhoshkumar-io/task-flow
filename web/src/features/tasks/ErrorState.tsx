import { Button } from "../../components/ui/Button";
import { messageOf, traceLine } from "../../lib/errors";

// The error panel from section 7: a ↻ Try Again button and a small grey line
// reading "Request ID: b1f2fc4 · 500 from /api/tasks". Both lines are built in
// lib/errors.ts, which the toast shares.

export function ErrorState({
  error,
  onRetry,
  retrying,
}: {
  error: unknown;
  onRetry: () => void;
  retrying?: boolean;
}) {
  return (
    <div className="flex flex-col items-center px-6 py-16 text-center">
      <span
        aria-hidden="true"
        className="mb-4 inline-flex size-12 items-center justify-center rounded-full bg-status-blocked-bg text-destructive"
      >
        <svg
          viewBox="0 0 24 24"
          className="size-6"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
        >
          <circle cx="12" cy="12" r="8" />
          <path d="M12 8v4.5M12 16h.01" />
        </svg>
      </span>

      <h2 className="text-base font-semibold text-ink">Couldn't load tasks</h2>
      <p className="mt-1 max-w-sm text-sm text-muted">{messageOf(error)}</p>

      <Button className="mt-6" onClick={onRetry} loading={retrying}>
        {!retrying && <RetryIcon />}
        Try Again
      </Button>

      <p className="mt-4 text-xs text-muted">{traceLine(error)}</p>
    </div>
  );
}

function RetryIcon() {
  return (
    <svg
      viewBox="0 0 16 16"
      aria-hidden="true"
      className="size-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M13.5 8a5.5 5.5 0 1 1-1.6-3.9" />
      <path d="M13.5 2v3h-3" />
    </svg>
  );
}
