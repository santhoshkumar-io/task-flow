import type { ReactNode } from "react";
import { PersonAvatar } from "../../components/PersonAvatar";
import { Card } from "../../components/ui/Card";
import { cn } from "../../lib/cn";
import { formatFullDate, formatRelative, formatShortDate, isOverdue } from "../../lib/time";
import type { Task } from "../../types";
import { PriorityDot } from "./PriorityDot";
import { StatusBadge } from "./StatusBadge";

// The right rail's first card — section 6. Label on the left, value on the
// right, in the design's order.
//
// On a phone it becomes a two-across grid with the label ABOVE its value —
// the phone frame's shape. Seven rows of label-hard-left and value-hard-
// right across 390px leave a lake of white down the middle of every one.
//
// Status and Priority drop out of the grid below 768px because they are
// already the two badges directly under the title. Nothing is lost; it is
// just not said twice on the screen with the least room to say it twice.

export function TaskInfoCard({
  task,
  className,
}: {
  task: Task;
  /** Where it sits in the phone stack. See TaskDetailPage. */
  className?: string;
}) {
  const overdue = isOverdue(task.dueDate) && task.status !== "done";

  return (
    <Card padding="none" className={className}>
      <h2 className="border-b border-line px-4 py-3 font-heading text-sm font-semibold text-ink">
        Task information
      </h2>

      <dl className="grid grid-cols-2 gap-x-3 gap-y-4 px-4 py-4 md:block md:divide-y md:divide-line md:p-0">
        <Row label="Assignee">
          {task.assigneeId ? (
            <span className="inline-flex items-center gap-2">
              <PersonAvatar person={task.assigneeId} size="sm" />
              {task.assigneeId.name}
            </span>
          ) : (
            <span className="text-muted">Unassigned</span>
          )}
        </Row>

        <Row label="Status" desktopOnly>
          <StatusBadge status={task.status} />
        </Row>

        <Row label="Priority" desktopOnly>
          <PriorityDot priority={task.priority} />
        </Row>

        <Row label="Due date">
          {task.dueDate ? (
            <span
              className={cn(overdue && "font-medium text-destructive")}
              title={formatFullDate(task.dueDate)}
            >
              {formatShortDate(task.dueDate)}
              {/* Only flagged while it still matters. A finished task was not
                  delivered late by being marked done. */}
              {overdue && " · overdue"}
            </span>
          ) : (
            <span className="text-muted">None</span>
          )}
        </Row>

        <Row label="Created by">
          <span className="inline-flex items-center gap-2">
            <PersonAvatar person={task.creatorId} size="sm" />
            {task.creatorId.name}
          </span>
        </Row>

        {/* Pushed to the end of the phone grid so the four the frame draws
            — Assignee, Due date, Created by, Updated — land as its two neat
            rows. The desktop order is untouched: `order` does nothing to a
            block layout. */}
        <Row label="Created" className="order-last md:order-none">
          <span title={formatFullDate(task.createdAt)}>
            {formatShortDate(task.createdAt)}
          </span>
        </Row>

        <Row label="Updated">
          <span title={formatFullDate(task.updatedAt)}>
            {formatRelative(task.updatedAt)}
          </span>
        </Row>
      </dl>
    </Card>
  );
}

function Row({
  label,
  children,
  desktopOnly,
  className,
}: {
  label: string;
  children: ReactNode;
  /** Left out of the phone grid, because the header already says it. */
  desktopOnly?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "min-w-0 md:flex md:items-center md:justify-between md:gap-3 md:px-4 md:py-2.5",
        desktopOnly && "hidden md:flex",
        className,
      )}
    >
      <dt className="text-xs text-muted md:shrink-0">{label}</dt>
      <dd className="mt-1 min-w-0 text-sm text-ink md:mt-0 md:text-right">
        {children}
      </dd>
    </div>
  );
}
