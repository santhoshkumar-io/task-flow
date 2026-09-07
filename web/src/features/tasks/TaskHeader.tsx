import { Link } from "react-router-dom";
import { Button } from "../../components/ui/Button";
import { cn } from "../../lib/cn";
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
  onDuplicate: () => void;
  onDelete: () => void;
  /** Where it sits in the phone stack. See TaskDetailPage. */
  className?: string;
}

export function TaskHeader({
  task,
  activity,
  canDelete,
  onEdit,
  onDuplicate,
  onDelete,
  className,
}: TaskHeaderProps) {
  const actor = lastEditor(task, activity);

  return (
    // One grid, laid out twice, so the ⋯ menu exists ONCE in the page.
    //
    // The phone frame puts it on a bar beside the back link; the desktop
    // frame puts it beside Edit, under the back link. Rendering it in both
    // places would put two buttons named "Task actions" in the document,
    // one of them always hidden — a trap for anything that looks the page
    // up by name, tests included.
    <div
      className={cn(
        "grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-4",
        className,
      )}
    >
      <Link
        to="/tasks"
        className="col-start-1 row-start-1 inline-flex items-center gap-1.5 self-center text-sm text-muted hover:text-ink md:self-start"
      >
        <span aria-hidden="true">←</span>
        {/* The phone bar says where the arrow goes; the desktop link has
            room to say it in full. */}
        <span className="font-medium text-ink md:hidden">Tasks</span>
        <span className="hidden md:inline">Back to tasks</span>
      </Link>

      {/* Row 1 on a phone, beside the back link. Row 2 on desktop, beside
          the title. Edit is desktop-only: the frame does not draw it on a
          phone, and "Edit task" is the first item in the menu anyway. */}
      <div className="col-start-2 row-start-1 flex items-center gap-2 self-center justify-self-end md:row-start-2 md:self-start">
        <Button
          variant="secondary"
          onClick={onEdit}
          className="hidden md:inline-flex"
        >
          Edit
        </Button>
        <TaskActionsMenu
          onEdit={onEdit}
          onDuplicate={onDuplicate}
          onDelete={onDelete}
          canDelete={canDelete}
        />
      </div>

      <div className="col-start-1 col-end-3 row-start-2 mt-4 min-w-0 md:col-end-2">
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
