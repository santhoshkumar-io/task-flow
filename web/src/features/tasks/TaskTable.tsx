import { Link } from "react-router-dom";
import { Avatar } from "../../components/ui/Avatar";
import { cn } from "../../lib/cn";
import { formatFullDate, formatRelative, formatShortDate } from "../../lib/time";
import type { Task } from "../../types";
import { PriorityDot } from "./PriorityDot";
import { StatusBadge } from "./StatusBadge";
import { TaskActionsMenu } from "./TaskActionsMenu";

// Seven columns, as section 4 draws.
//
// V7 shipped six: the Actions ⋯ was left out because Edit and Delete did not
// exist yet and Duplicate is on the exclusion list, so the button would have
// been a control that silently does nothing. V8 gives it two real items and it
// comes back, closing that deviation. Duplicate stays out.

interface TaskTableProps {
  tasks: Task[];
  /** True while the NEXT page is loading and this one is still on screen. */
  dimmed?: boolean;
  /** The signed-in person's id — only the creator sees Delete. */
  currentUserId?: string;
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
}

export function TaskTable({
  tasks,
  dimmed = false,
  currentUserId,
  onEdit,
  onDelete,
}: TaskTableProps) {
  return (
    // Between 768 and 1023px the table keeps a horizontal scroll rather than
    // squashing — section 8.9. The scroll is on this box, so the page itself
    // never moves sideways.
    <div
      className={cn(
        "overflow-x-auto transition-opacity",
        dimmed && "pointer-events-none opacity-60",
      )}
    >
      <table className="w-full min-w-[860px] border-collapse text-left">
        <thead>
          <tr className="border-b border-line">
            <Th className="w-[34%]">Task</Th>
            <Th>Status</Th>
            <Th>Priority</Th>
            <Th>Assignee</Th>
            <Th>Created</Th>
            <Th>Updated</Th>
            <Th className="w-12">
              <span className="sr-only">Actions</span>
            </Th>
          </tr>
        </thead>

        <tbody>
          {tasks.map((task) => (
            <tr
              key={task._id}
              className="h-row border-b border-line last:border-0 hover:bg-surface"
            >
              <Td>
                {/* The link fills the cell so the whole title area is
                    clickable, and it is a real <a> — middle-click and
                    "open in new tab" work, which an onClick handler breaks. */}
                <Link
                  to={`/tasks/${task._id}`}
                  className="block focus:outline-none focus-visible:underline"
                >
                  <span className="block truncate font-medium text-ink">
                    {task.title}
                  </span>
                  <span className="block text-xs text-muted">{task.key}</span>
                </Link>
              </Td>

              <Td>
                <StatusBadge status={task.status} />
              </Td>

              <Td>
                <PriorityDot priority={task.priority} />
              </Td>

              <Td>
                {task.assigneeId ? (
                  <span className="inline-flex items-center gap-2">
                    <Avatar name={task.assigneeId.name} size="sm" />
                    <span className="truncate">{task.assigneeId.name}</span>
                  </span>
                ) : (
                  <span className="text-muted">Unassigned</span>
                )}
              </Td>

              <Td className="whitespace-nowrap text-muted">
                <span title={formatFullDate(task.createdAt)}>
                  {formatShortDate(task.createdAt)}
                </span>
              </Td>

              <Td className="whitespace-nowrap text-muted">
                <span title={formatFullDate(task.updatedAt)}>
                  {formatRelative(task.updatedAt)}
                </span>
              </Td>

              <Td>
                <TaskActionsMenu
                  size="sm"
                  onEdit={() => onEdit(task)}
                  onDelete={() => onDelete(task)}
                  canDelete={task.creatorId._id === currentUserId}
                />
              </Td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Th({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <th
      scope="col"
      className={cn(
        "px-4 py-2.5 text-xs font-medium whitespace-nowrap text-muted",
        className,
      )}
    >
      {children}
    </th>
  );
}

function Td({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <td className={cn("px-4 text-sm text-ink", className)}>{children}</td>;
}
