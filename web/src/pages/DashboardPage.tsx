import { Card } from "../components/ui/Card";
import { RecentTasksCard } from "../features/dashboard/RecentTasksCard";
import {
  ClockIcon,
  InboxIcon,
  StackIcon,
  StatCard,
  TickIcon,
} from "../features/dashboard/StatCard";
import { ErrorState } from "../features/tasks/ErrorState";
import { useAuth } from "../features/auth/auth-context";
import { useTaskStats } from "../hooks/useStats";

export function DashboardPage() {
  const { user } = useAuth();
  const stats = useTaskStats();

  return (
    <div>
      <h1 className="font-heading text-2xl font-bold tracking-[-0.02em] text-ink">
        {/* The name comes from GET /api/auth/me, like everything else here. */}
        {user ? `Welcome back, ${user.name.split(" ")[0]}` : "Dashboard"}
      </h1>
      <p className="mt-1 text-sm text-muted">
        Here's where the work stands right now.
      </p>

      {stats.isError ? (
        // Not four zeros. A zero would read as a real count saying there is no
        // work, which is a worse lie than an error is an inconvenience.
        <Card padding="none" className="mt-6">
          <ErrorState
            error={stats.error}
            onRetry={() => void stats.refetch()}
            retrying={stats.isFetching}
          />
        </Card>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {/* value is undefined until the API answers, and StatCard draws a
              grey block rather than a placeholder digit.

              Every `to` is a filter the task list already understands —
              useTaskFilters reads ?status= and checks it against the five real
              statuses, so nothing had to be added on the list's side and the
              filter chip appears on arrival. */}
          <StatCard
            label="Total tasks"
            value={stats.data?.total}
            icon={<StackIcon />}
            to="/tasks"
          />
          <StatCard
            label="To Do"
            value={stats.data?.todo}
            icon={<InboxIcon />}
            to="/tasks?status=todo"
          />
          <StatCard
            label="In Progress"
            value={stats.data?.inProgress}
            icon={<ClockIcon />}
            tone="accent"
            to="/tasks?status=in_progress"
          />
          <StatCard
            label="Done"
            value={stats.data?.done}
            icon={<TickIcon />}
            tone="success"
            to="/tasks?status=done"
          />
        </div>
      )}

      <div className="mt-6">
        <RecentTasksCard />
      </div>

      {/* Said on screen, because the four cards genuinely do not add up:
          in_review and blocked are real statuses with no card of their own. */}
      <p className="mt-3 text-xs text-muted">
        Total counts every task. In Review and Blocked have no card of their
        own, so the three status counts add up to less than the total.
      </p>
    </div>
  );
}
