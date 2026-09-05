import { Link } from "react-router-dom";
import { Avatar } from "../../components/ui/Avatar";
import { cn } from "../../lib/cn";
import { formatShortDate, isOverdue } from "../../lib/time";
import type { Task } from "../../types";
import { PriorityDot } from "./PriorityDot";
import { StatusBadge } from "./StatusBadge";

// Below 768px the table becomes a stack of these — section 8.9.
//
// Same data, different shape, from section 4: the title, then
// "TF-118 · due Aug 29", then the status pill and priority dot on one row with
// the assignee pushed right.

export function TaskCard({ task }: { task: Task }) {
  const overdue = isOverdue(task.dueDate) && task.status !== "done";

  return (
    <Link
      to={`/tasks/${task._id}`}
      className="block rounded-lg border border-line bg-white p-4 shadow-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/30 active:bg-surface"
    >
      <p className="font-medium text-ink">{task.title}</p>

      <p className="mt-0.5 text-xs text-muted">
        {task.key}
        {task.dueDate && (
          <>
            {" · "}
            {/* Red only while it still matters. A task that is done was not
                delivered late by being marked done, and a permanent red mark
                on a finished task is just noise. */}
            <span className={cn(overdue && "font-medium text-destructive")}>
              due {formatShortDate(task.dueDate)}
            </span>
          </>
        )}
      </p>

      <div className="mt-3 flex items-center gap-3">
        <StatusBadge status={task.status} />
        <PriorityDot priority={task.priority} className="text-xs" />

        <span className="ml-auto">
          {task.assigneeId ? (
            <Avatar name={task.assigneeId.name} size="sm" />
          ) : (
            <span className="text-xs text-muted">Unassigned</span>
          )}
        </span>
      </div>
    </Link>
  );
}
