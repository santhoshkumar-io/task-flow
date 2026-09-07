import { Link } from "react-router-dom";
import { PersonAvatar } from "../../components/PersonAvatar";
import { cn } from "../../lib/cn";
import { formatShortDate, isOverdue } from "../../lib/time";
import type { Task } from "../../types";
import { PriorityDot } from "./PriorityDot";
import { StatusBadge } from "./StatusBadge";
import { TaskActionsMenu } from "./TaskActionsMenu";

// Below 768px the table becomes a stack of these — section 8.9.
//
// Same data, different shape, from section 4: the title, then
// "TF-118 · due Aug 29", then the status pill and priority dot on one row with
// the assignee pushed right.

export function TaskCard({
  task,
  currentUserId,
  showActions = true,
  onEdit,
  onDuplicate,
  onDelete,
}: {
  task: Task;
  currentUserId?: string;
  /** Off on the dashboard, where the card is a summary rather than a control. */
  showActions?: boolean;
  onEdit?: (task: Task) => void;
  onDuplicate?: (task: Task) => void;
  onDelete?: (task: Task) => void;
}) {
  const overdue = isOverdue(task.dueDate) && task.status !== "done";

  return (
    <Link
      to={`/tasks/${task._id}`}
      className="relative block rounded-lg border border-line bg-white p-4 shadow-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/30 active:bg-surface"
    >
      {/* The ⋯ in the corner, as section 4 draws. It stops its own clicks from
          reaching the card, which would otherwise open the task. */}
      {showActions && (
        <div className="absolute top-3 right-3">
          <TaskActionsMenu
            size="sm"
            onEdit={() => onEdit?.(task)}
            onDuplicate={() => onDuplicate?.(task)}
            onDelete={() => onDelete?.(task)}
            canDelete={task.creatorId._id === currentUserId}
          />
        </div>
      )}

      <p className={cn("font-medium text-ink", showActions && "pr-10")}>
        {task.title}
      </p>

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
            <PersonAvatar person={task.assigneeId} size="sm" />
          ) : (
            <span className="text-xs text-muted">Unassigned</span>
          )}
        </span>
      </div>
    </Link>
  );
}
