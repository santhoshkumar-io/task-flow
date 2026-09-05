import { useNavigate } from "react-router-dom";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";

// Shown for a 404 and for a 400 INVALID_ID.
//
// Both mean the same thing to a person — "there is no task at this address" —
// and 404 is also the answer for somebody else's task that you may not delete,
// by design: 403 would confirm the task exists, which is exactly what
// docs/decisions/0006 avoids leaking.
//
// A clean screen rather than a crash or a blank page, which is what the exit
// check asks for.

export function NotFoundTask() {
  const navigate = useNavigate();

  return (
    <Card className="mx-auto max-w-md">
      <div className="flex flex-col items-center py-10 text-center">
        <span
          aria-hidden="true"
          className="mb-4 inline-flex size-12 items-center justify-center rounded-full bg-surface text-muted"
        >
          <svg
            viewBox="0 0 24 24"
            className="size-6"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="6" />
            <path d="m20 20-4.5-4.5M9 11h4" />
          </svg>
        </span>

        <h1 className="font-heading text-xl font-semibold text-ink">
          Task not found
        </h1>
        <p className="mt-1 max-w-xs text-sm text-muted">
          It may have been deleted, or the link may be wrong.
        </p>

        <div className="mt-6 flex items-center gap-3">
          {/* Back in history, not a link to /tasks — it returns to the filters
              and page they were on, which the URL still holds. */}
          <Button variant="secondary" onClick={() => navigate(-1)}>
            Go back
          </Button>
          <Button onClick={() => navigate("/tasks")}>All tasks</Button>
        </div>
      </div>
    </Card>
  );
}
