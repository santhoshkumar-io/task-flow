import { Link } from "react-router-dom";
import { Card } from "../../components/ui/Card";
import { ErrorState } from "../tasks/ErrorState";
import { TaskCard } from "../tasks/TaskCard";
import { TaskTable } from "../tasks/TaskTable";
import { TaskTableSkeleton } from "../tasks/TaskTableSkeleton";
import { useTasks } from "../../hooks/useTasks";

// The SAME TaskTable the list screen uses — a different caller, not a copy.
// Six rows, newest first, no filters, and no ⋯ column, because this card is a
// summary rather than a place to act.
//
// The query key is ["tasks", {…}] like every other list, so this shares the
// cache with the task list: if these exact six were already fetched, they are
// on screen immediately.

const RECENT = { page: 1, limit: 6, sort: "updatedAt", order: "desc" } as const;

export function RecentTasksCard() {
  const tasks = useTasks(RECENT);

  return (
    <Card padding="none">
      <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
        <h2 className="font-heading text-sm font-semibold text-ink">
          Recent Tasks
        </h2>
        {/* Two words on a phone, where the header row is 300px wide. The
            link is named in full for a screen reader either way, so what it
            leads to never depends on the width of the screen. */}
        <Link
          to="/tasks"
          aria-label="View all tasks"
          className="shrink-0 text-xs font-medium text-accent hover:underline"
        >
          <span className="md:hidden">View all</span>
          <span className="hidden md:inline">View all tasks →</span>
        </Link>
      </div>

      {tasks.isPending ? (
        <TaskTableSkeleton />
      ) : tasks.isError ? (
        <ErrorState
          error={tasks.error}
          onRetry={() => void tasks.refetch()}
          retrying={tasks.isFetching}
        />
      ) : tasks.data.items.length === 0 ? (
        <p className="px-4 py-10 text-center text-sm text-muted">
          No tasks yet.
        </p>
      ) : (
        <>
          <div className="hidden md:block">
            <TaskTable tasks={tasks.data.items} showActions={false} />
          </div>

          <div className="space-y-3 p-4 md:hidden">
            {tasks.data.items.map((task) => (
              <TaskCard key={task._id} task={task} showActions={false} />
            ))}
          </div>
        </>
      )}
    </Card>
  );
}
