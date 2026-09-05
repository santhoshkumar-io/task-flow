import { TASK_SORTS, type TaskSort } from "../../api/tasks.api";
import { Input } from "../../components/ui/Input";
import { Select } from "../../components/ui/Select";
import type { FilterKey } from "../../hooks/useTaskFilters";
import type { TaskFilters } from "../../hooks/useTaskFilters";
import {
  PRIORITY_LABELS,
  STATUS_LABELS,
  TASK_PRIORITIES,
  TASK_STATUSES,
  type PersonRef,
} from "../../types";

const STATUS_OPTIONS = TASK_STATUSES.map((status) => ({
  value: status,
  label: STATUS_LABELS[status],
}));

const PRIORITY_OPTIONS = TASK_PRIORITIES.map((priority) => ({
  value: priority,
  label: PRIORITY_LABELS[priority],
}));

const SORT_LABELS: Record<TaskSort, string> = {
  updatedAt: "Last updated",
  createdAt: "Date created",
  priority: "Priority",
  dueDate: "Due date",
  title: "Title",
};

const SORT_OPTIONS = TASK_SORTS.map((sort) => ({
  value: sort,
  label: SORT_LABELS[sort],
}));

interface FilterBarProps {
  filters: TaskFilters;
  searchInput: string;
  onSearchChange: (value: string) => void;
  onFilterChange: (key: FilterKey, value: string) => void;
  onSortChange: (sort: TaskSort, order: "asc" | "desc") => void;
  onClear: () => void;
  activeFilters: { key: FilterKey; value: string }[];
  users: PersonRef[];
}

export function FilterBar({
  filters,
  searchInput,
  onSearchChange,
  onFilterChange,
  onSortChange,
  onClear,
  activeFilters,
  users,
}: FilterBarProps) {
  const assigneeOptions = [
    { value: "unassigned", label: "Unassigned" },
    ...users.map((user) => ({ value: user._id, label: user.name })),
  ];

  // A chip has to read as words, not as the raw value in the URL. An assignee
  // id means nothing to anybody, so it is looked up in the team list.
  const chipLabel = (key: FilterKey, value: string): string => {
    switch (key) {
      case "q":
        return `Search : ${value}`;
      case "status":
        return `Status : ${STATUS_LABELS[value as never] ?? value}`;
      case "priority":
        return `Priority : ${PRIORITY_LABELS[value as never] ?? value}`;
      case "assigneeId":
        return `Assignee : ${
          assigneeOptions.find((option) => option.value === value)?.label ??
          // The list may still be loading, or the person may have been
          // removed. Naming the filter honestly beats showing a raw id.
          "Someone"
        }`;
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-[200px] flex-1 md:max-w-xs">
          <Input
            type="search"
            value={searchInput}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search tasks…"
            aria-label="Search tasks"
          />
        </div>

        <Select
          label="Status"
          emptyLabel="All"
          value={filters.status}
          onChange={(value) => onFilterChange("status", value)}
          options={STATUS_OPTIONS}
        />

        <Select
          label="Priority"
          emptyLabel="All"
          value={filters.priority}
          onChange={(value) => onFilterChange("priority", value)}
          options={PRIORITY_OPTIONS}
        />

        <Select
          label="Assignee"
          emptyLabel="Anyone"
          value={filters.assigneeId}
          onChange={(value) => onFilterChange("assigneeId", value)}
          options={assigneeOptions}
        />

        {/* Pushed to the far right, as drawn in section 4. */}
        <div className="flex items-center gap-1 md:ml-auto">
          <Select
            label="Sort"
            value={filters.sort}
            onChange={(value) => onSortChange(value as TaskSort, filters.order)}
            options={SORT_OPTIONS}
          />
          <button
            type="button"
            onClick={() =>
              onSortChange(filters.sort, filters.order === "asc" ? "desc" : "asc")
            }
            title={
              filters.order === "asc"
                ? "Sorted oldest first — click for newest first"
                : "Sorted newest first — click for oldest first"
            }
            aria-label={`Sort direction: ${
              filters.order === "asc" ? "ascending" : "descending"
            }`}
            className="inline-flex size-10 items-center justify-center rounded-lg border border-line bg-white text-muted hover:bg-surface focus:border-accent focus:ring-2 focus:ring-accent/30 focus:outline-none"
          >
            <SortArrows ascending={filters.order === "asc"} />
          </button>
        </div>
      </div>

      {activeFilters.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          {activeFilters.map(({ key, value }) => (
            <span
              key={key}
              className="inline-flex h-[22px] items-center gap-1.5 rounded-md border border-line bg-surface px-2 text-xs text-ink"
            >
              {chipLabel(key, value)}
              <button
                type="button"
                onClick={() => onFilterChange(key, "")}
                aria-label={`Remove filter ${chipLabel(key, value)}`}
                className="text-muted hover:text-ink"
              >
                <svg
                  viewBox="0 0 16 16"
                  aria-hidden="true"
                  className="size-3"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                >
                  <path d="m4 4 8 8M12 4l-8 8" />
                </svg>
              </button>
            </span>
          ))}

          <button
            type="button"
            onClick={onClear}
            className="text-xs font-medium text-accent hover:underline"
          >
            Clear all
          </button>
        </div>
      )}
    </div>
  );
}

function SortArrows({ ascending }: { ascending: boolean }) {
  return (
    <svg
      viewBox="0 0 16 16"
      aria-hidden="true"
      className="size-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {/* The arrow pointing the way the list is ordered is the solid one. */}
      <g opacity={ascending ? 1 : 0.35}>
        <path d="M5 13V3M2.5 5.5 5 3l2.5 2.5" />
      </g>
      <g opacity={ascending ? 0.35 : 1}>
        <path d="M11 3v10M8.5 10.5 11 13l2.5-2.5" />
      </g>
    </svg>
  );
}
