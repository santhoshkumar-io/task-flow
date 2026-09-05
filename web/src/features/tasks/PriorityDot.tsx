import { cn } from "../../lib/cn";
import { PRIORITY_LABELS, type TaskPriority } from "../../types";

// A coloured dot and plain text. Deliberately NOT a Badge.
//
// Section 4 of the design reference is explicit about this: "Priority is a
// coloured dot and plain text — no pill. This difference is deliberate in the
// design; keep it." It is what stops a row reading as two competing pills and
// lets the status pill be the thing the eye lands on.

const DOTS: Record<TaskPriority, string> = {
  low: "bg-muted",
  medium: "bg-accent",
  high: "bg-warning",
  urgent: "bg-destructive",
};

export function PriorityDot({
  priority,
  className,
}: {
  priority: TaskPriority;
  className?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2 text-sm", className)}>
      <span
        aria-hidden="true"
        className={cn("size-2 shrink-0 rounded-full", DOTS[priority])}
      />
      {PRIORITY_LABELS[priority]}
    </span>
  );
}
