import { CheckCircle2, CircleDashed, Clock, Layers, Plus } from "lucide-react";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { RecentTasksCard } from "../features/dashboard/RecentTasksCard";
import { Gain, Note, StatCard, Trend } from "../features/dashboard/StatCard";
import { ErrorState } from "../features/tasks/ErrorState";
import { useAuth } from "../features/auth/auth-context";
import { useCreateTask } from "../features/tasks/create-task-context";
import { useMyOpenTaskCount, useTaskStats } from "../hooks/useStats";

export function DashboardPage() {
  const { user } = useAuth();
  const stats = useTaskStats();
  const mine = useMyOpenTaskCount();
  const { open: openCreate } = useCreateTask();

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-[-0.02em] text-ink">
            {/* The name comes from GET /api/auth/me, like everything else here.
                The greeting follows the clock, as the design's "Good morning,
                Alex" implies — a fixed "Good morning" on a screen opened at
                nine in the evening is a small, avoidable lie. */}
            {user ? `${greeting()}, ${user.name.split(" ")[0]}` : "Dashboard"}
          </h1>
          <p className="mt-1 text-sm text-muted">
            Here's what's happening with your tasks.
          </p>
        </div>

        <Button onClick={openCreate}>
          <Plus className="size-5" aria-hidden="true" />
          Create Task
        </Button>
      </div>

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
        // Two per row on a phone, matching the design's mobile frame — not one,
        // which pushed Recent Tasks below the fold.
        <div className="mt-6 grid grid-cols-2 gap-4 xl:grid-cols-4">
          {/* Every `to` is a filter the task list already understands:
              useTaskFilters reads ?status= and checks it against the five real
              statuses, so nothing had to be added on the list's side. */}
          <StatCard
            label="Total Tasks"
            value={stats.data?.total}
            icon={<Layers className="size-5" aria-hidden="true" />}
            to="/tasks"
            hint={
              <Trend
                current={stats.data?.createdThisWeek}
                previous={stats.data?.createdLastWeek}
                fallback={`${stats.data?.createdThisWeek ?? 0} added this week`}
              />
            }
          />
          <StatCard
            label="To Do"
            value={stats.data?.todo}
            icon={<CircleDashed className="size-5" aria-hidden="true" />}
            to="/tasks?status=todo"
            hint={
              mine === undefined ? undefined : (
                <Note>{mine.open} assigned to you</Note>
              )
            }
          />
          <StatCard
            label="In Progress"
            value={stats.data?.inProgress}
            icon={<Clock className="size-5" aria-hidden="true" />}
            to="/tasks?status=in_progress"
            hint={<Note>{stats.data?.dueThisWeek} due this week</Note>}
          />
          <StatCard
            label="Completed"
            value={stats.data?.done}
            icon={<CheckCircle2 className="size-5" aria-hidden="true" />}
            to="/tasks?status=done"
            hint={
              <Gain value={stats.data?.completedThisWeek} suffix="this week" />
            }
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

/** Morning until noon, afternoon until six, evening after that. */
function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}
