import { Card } from "../../components/ui/Card";
import { formatFullDate, formatRelative } from "../../lib/time";
import {
  PRIORITY_LABELS,
  STATUS_LABELS,
  type Activity,
  type PersonRef,
  type TaskPriority,
  type TaskStatus,
} from "../../types";

// The Activity card in the right rail — who changed what, newest first.
//
// It matters more here than it would elsewhere: anyone logged in may edit any
// task (docs/decisions/0006), so without this there is no trace of who moved
// something to Done.

export function ActivityCard({
  activity,
  people,
  className,
}: {
  activity: Activity[];
  /** The team list, used to turn the ids in an assignee row into names. */
  people: PersonRef[];
  /** Where it sits in the phone stack. See TaskDetailPage. */
  className?: string;
}) {
  return (
    <Card padding="none" className={className}>
      <h2 className="border-b border-line px-4 py-3 font-heading text-sm font-semibold text-ink">
        Activity
      </h2>

      {activity.length === 0 ? (
        <p className="px-4 py-3 text-xs text-muted">Nothing recorded yet.</p>
      ) : (
        <ul className="divide-y divide-line">
          {activity.map((row) => (
            <li key={row._id} className="px-4 py-3 text-xs">
              <p className="text-ink">
                <span className="font-medium">{row.actorId.name}</span>{" "}
                {describe(row, people)}
              </p>
              <p
                className="mt-0.5 text-muted"
                title={formatFullDate(row.createdAt)}
              >
                {formatRelative(row.createdAt)}
              </p>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

/** The sentence after the actor's name. */
function describe(row: Activity, people: PersonRef[]): string {
  switch (row.type) {
    case "created":
      return "created this task";

    case "status_changed":
      return `changed status from ${statusLabel(row.from)} to ${statusLabel(row.to)}`;

    case "priority_changed":
      return `changed priority from ${priorityLabel(row.from)} to ${priorityLabel(row.to)}`;

    case "assignee_changed":
      // An assignee row stores raw ids, not names — the server has no cheap way
      // to record a name that would still be correct if the person is renamed
      // later. So the ids are resolved here, against the live team list.
      return `reassigned this from ${personLabel(row.from, people)} to ${personLabel(row.to, people)}`;
  }
}

function statusLabel(value: string | null): string {
  return value ? (STATUS_LABELS[value as TaskStatus] ?? value) : "nothing";
}

function priorityLabel(value: string | null): string {
  return value ? (PRIORITY_LABELS[value as TaskPriority] ?? value) : "nothing";
}

function personLabel(id: string | null, people: PersonRef[]): string {
  if (!id) return "nobody";

  // The person may have been removed since. Saying so beats printing a raw id
  // at somebody, and beats inventing a name.
  return people.find((person) => person._id === id)?.name ?? "someone else";
}
