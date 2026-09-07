import { AlertCircle, RotateCw } from "lucide-react";
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
        <AlertCircle className="size-8" aria-hidden="true" />
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
    <RotateCw className="size-4" aria-hidden="true" />
  );
}
