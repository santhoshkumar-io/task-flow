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

export function TaskInfoCard({ task }: { task: Task }) {
  const overdue = isOverdue(task.dueDate) && task.status !== "done";

  return (
    <Card padding="none">
      <h2 className="border-b border-line px-4 py-3 font-heading text-sm font-semibold text-ink">
        Task information
      </h2>

      <dl className="divide-y divide-line">
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

        <Row label="Status">
          <StatusBadge status={task.status} />
        </Row>

        <Row label="Priority">
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

        <Row label="Created">
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

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-2.5">
      <dt className="shrink-0 text-xs text-muted">{label}</dt>
      <dd className="min-w-0 text-right text-sm text-ink">{children}</dd>
    </div>
  );
}
