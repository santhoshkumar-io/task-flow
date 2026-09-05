import { Link } from "react-router-dom";
import { Button } from "../../components/ui/Button";
import { formatFullDate, formatRelative } from "../../lib/time";
import type { Activity, Task } from "../../types";
import { PriorityDot } from "./PriorityDot";
import { StatusBadge } from "./StatusBadge";
import { TaskActionsMenu } from "./TaskActionsMenu";

interface TaskHeaderProps {
  task: Task;
  activity: Activity[];
  canDelete: boolean;
  onEdit: () => void;
  onDelete: () => void;
}

export function TaskHeader({
  task,
  activity,
  canDelete,
  onEdit,
  onDelete,
}: TaskHeaderProps) {
  const actor = lastEditor(task, activity);

  return (
    <div>
      <Link
        to="/tasks"
        className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink"
      >
        <span aria-hidden="true">←</span> Back to tasks
      </Link>

      <div className="mt-4 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs text-muted">{task.key}</p>
          <h1 className="mt-1 font-heading text-2xl font-bold tracking-[-0.02em] text-ink">
            {task.title}
          </h1>

          <div className="mt-3 flex flex-wrap items-center gap-3">
            <StatusBadge status={task.status} />
            <PriorityDot priority={task.priority} className="text-xs" />
            <span className="text-xs text-muted" title={formatFullDate(task.updatedAt)}>
              Updated {formatRelative(task.updatedAt)}
              {actor && ` by ${actor}`}
            </span>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <Button variant="secondary" onClick={onEdit}>
            Edit
          </Button>
          <TaskActionsMenu
            onEdit={onEdit}
            onDelete={onDelete}
            canDelete={canDelete}
          />
        </div>
      </div>
    </div>
  );
}

/**
 * Who last changed this task — or null when we cannot honestly say.
 *
 * The design's line is "Updated 2 hours ago by Sarah Chen", but a task record
 * has no "last edited by" field. The only source is the newest activity row,
 * and the server writes those for status, priority and assignee ONLY. Edit a
 * title and `updatedAt` moves while no row is written — so naming that row's
 * actor would credit the wrong person for somebody else's change.
 *
 * So the name is used only when the newest row is within two seconds of
 * `updatedAt`, meaning it really is the change that last touched this task.
 * Otherwise the line is just the time. AGENTS.md: nothing on screen that did
 * not come from a response, and a plausible-looking wrong name is worse than
 * no name.
 *
 * Two seconds because the activity row is inserted just after the task is
 * saved, so the two timestamps are close but never identical.
 */
function lastEditor(task: Task, activity: Activity[]): string | null {
  const newest = activity[0];
  if (!newest) return null;

  const gap = Math.abs(
    new Date(task.updatedAt).getTime() - new Date(newest.createdAt).getTime(),
  );

  return gap <= 2000 ? newest.actorId.name : null;
}
