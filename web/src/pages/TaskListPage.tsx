import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Toast, ToastProvider } from "../components/ui/Toast";
import { EmptyState } from "../features/tasks/EmptyState";
import { ErrorState } from "../features/tasks/ErrorState";
import { messageOf } from "../lib/errors";
import { FilterBar } from "../features/tasks/FilterBar";
import { Pagination } from "../features/tasks/Pagination";
import { TaskCard } from "../features/tasks/TaskCard";
import { TaskTable } from "../features/tasks/TaskTable";
import { TaskTableSkeleton } from "../features/tasks/TaskTableSkeleton";
import { DeleteTaskFromList } from "../features/tasks/DeleteTaskFromList";
import { useCreateTask } from "../features/tasks/create-task-context";
import { useAuth } from "../features/auth/auth-context";
import { useDuplicateTask } from "../hooks/useDuplicateTask";
import { useTaskFilters } from "../hooks/useTaskFilters";
import { useTasks, useUsers } from "../hooks/useTasks";
import type { Task } from "../types";

export function TaskListPage() {
  const {
    filters,
    query,
    searchInput,
    setSearchInput,
    setFilter,
    setSort,
    setPage,
    clearFilters,
    activeFilters,
    hasActiveFilters,
  } = useTaskFilters();

  const tasks = useTasks(query);
  const users = useUsers();
  const { open: openCreate } = useCreateTask();
  const { user } = useAuth();
  const navigate = useNavigate();
  const duplicate = useDuplicateTask();

  // Mobile "Load more" keeps what is already on screen, so it has to remember
  // the pages before this one. `upToPage` records which page the stack was
  // built for: if the URL has moved somewhere else — a filter changed, or a
  // desktop page button was pressed — the stack no longer applies and is
  // ignored rather than shown alongside the wrong page.
  const [stack, setStack] = useState<{ upToPage: number; items: Task[] }>({
    upToPage: 1,
    items: [],
  });

  const pageItems = tasks.data?.items ?? [];
  const stackApplies = stack.upToPage === filters.page;
  const mobileItems = stackApplies ? [...stack.items, ...pageItems] : pageItems;

  const loadMore = () => {
    setStack({
      upToPage: filters.page + 1,
      items: stackApplies ? [...stack.items, ...pageItems] : pageItems,
    });
    setPage(filters.page + 1);
  };

  // Dismissing the toast must not make it pop back on the next render, so the
  // error it was raised for is remembered rather than a bare true/false.
  const [dismissedError, setDismissedError] = useState<unknown>(null);
  const showToast = tasks.isError && dismissedError !== tasks.error;

  // Which task the ⋯ menu asked to delete. The whole task, not just its id,
  // so the dialog can name it before its comment count has arrived.
  const [deleteTarget, setDeleteTarget] = useState<Task | null>(null);

  return (
    <ToastProvider>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-[-0.02em] text-ink">
            Tasks
          </h1>
          <p className="mt-1 text-sm text-muted">
            Manage and track work across the team.
          </p>
        </div>

        <Button onClick={openCreate} className="hidden md:inline-flex">
          Create Task
        </Button>
      </div>

      <div className="mt-6">
        <FilterBar
          filters={filters}
          searchInput={searchInput}
          onSearchChange={setSearchInput}
          onFilterChange={setFilter}
          onSortChange={setSort}
          onClear={clearFilters}
          activeFilters={activeFilters}
          users={users.data ?? []}
        />
      </div>

      <Card padding="none" className="mt-4 overflow-hidden">
        {renderBody()}
      </Card>

      <Toast
        open={showToast}
        onOpenChange={(next) => {
          if (!next) setDismissedError(tasks.error);
        }}
        tone="destructive"
        title="Couldn't load tasks"
        description={tasks.isError ? messageOf(tasks.error) : undefined}
      />

      {deleteTarget && (
        <DeleteTaskFromList
          task={deleteTarget}
          onClose={() => setDeleteTarget(null)}
        />
      )}
    </ToastProvider>
  );

  function renderBody() {
    // isPending, not isLoading: with keepPreviousData there is only nothing to
    // show on the very first fetch. Every later one keeps the old page up.
    if (tasks.isPending) {
      return <TaskTableSkeleton />;
    }

    if (tasks.isError) {
      return (
        <ErrorState
          error={tasks.error}
          onRetry={() => void tasks.refetch()}
          retrying={tasks.isFetching}
        />
      );
    }

    if (tasks.data.total === 0) {
      return (
        <EmptyState
          // The whole reason there are two of these. With filters set this
          // says "No tasks found"; on an empty account it says "No tasks yet".
          filtered={hasActiveFilters}
          onClearFilters={clearFilters}
          onCreate={openCreate}
        />
      );
    }

    return (
      <>
        <div className="hidden md:block">
          {/* Dimmed, not replaced, while the next page loads — that is what
              keepPreviousData buys, and it is why paging does not flash. */}
          <TaskTable
            tasks={pageItems}
            dimmed={tasks.isPlaceholderData}
            currentUserId={user?._id}
            // Edit mode is a URL, so it survives a refresh and the back
            // button undoes it — the same rule as the filters,
            // docs/decisions/0010-filters-in-the-url.md.
            onEdit={(task) => navigate(`/tasks/${task._id}?edit=1`)}
            onDuplicate={(task) => duplicate.mutate(task)}
            onDelete={setDeleteTarget}
          />
        </div>

        <div className="space-y-3 p-4 md:hidden">
          {mobileItems.map((task) => (
            <TaskCard
              key={task._id}
              task={task}
              currentUserId={user?._id}
              onEdit={(target) => navigate(`/tasks/${target._id}?edit=1`)}
              onDuplicate={(target) => duplicate.mutate(target)}
              onDelete={setDeleteTarget}
            />
          ))}
        </div>

        <Pagination
          page={tasks.data}
          onPageChange={setPage}
          onLoadMore={loadMore}
          shownCount={mobileItems.length}
          loadingMore={tasks.isPlaceholderData}
        />
      </>
    );
  }
}
