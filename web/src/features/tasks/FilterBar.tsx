import { ArrowDown, ArrowUp, Search, SlidersHorizontal, X } from "lucide-react";
import { useState } from "react";
import { TASK_SORTS, type TaskSort } from "../../api/tasks.api";
import { Button } from "../../components/ui/Button";
import { Drawer } from "../../components/ui/Drawer";
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
  // The phone shows one button instead of the four controls. It opens them in
  // a full-screen sheet — section 8.9 asks for sheets at this width, and four
  // dropdowns laid out in a row take four stacked lines at 390px, pushing the
  // first task off the screen.
  const [sheetOpen, setSheetOpen] = useState(false);

  const assigneeOptions = [
    { value: "unassigned", label: "Unassigned" },
    ...users.map((user) => ({ value: user._id, label: user.name })),
  ];

  // A chip has to read as words, not as the raw value in the URL. An assignee
  // id means nothing to anybody, so it is looked up in the team list.
  //
  // Split into two halves because the phone frame drops the prefix — it draws
  // `In Progress ×`, not `Status : In Progress ×`. The full wording is still
  // what a screen reader hears, from chipLabel below.
  const chipPrefix = (key: FilterKey): string =>
    ({
      q: "Search",
      status: "Status",
      priority: "Priority",
      assigneeId: "Assignee",
    })[key];

  const chipValue = (key: FilterKey, value: string): string => {
    switch (key) {
      case "q":
        return value;
      case "status":
        return STATUS_LABELS[value as never] ?? value;
      case "priority":
        return PRIORITY_LABELS[value as never] ?? value;
      case "assigneeId":
        return (
          assigneeOptions.find((option) => option.value === value)?.label ??
          // The list may still be loading, or the person may have been
          // removed. Naming the filter honestly beats showing a raw id.
          "Someone"
        );
    }
  };

  const chipLabel = (key: FilterKey, value: string) =>
    `${chipPrefix(key)} : ${chipValue(key, value)}`;

  // The badge counts what is inside the sheet. Search sits outside it, in its
  // own box, so counting it would name a filter the sheet cannot show you.
  const sheetFilterCount = activeFilters.filter(
    (filter) => filter.key !== "q",
  ).length;

  // The same three dropdowns, drawn once and placed twice — in the desktop row
  // and inside the phone sheet. A second copy is where the two would drift.
  const statusSelect = (className?: string) => (
    <Select
      label="Status"
      emptyLabel="All"
      value={filters.status}
      onChange={(value) => onFilterChange("status", value)}
      options={STATUS_OPTIONS}
      className={className}
    />
  );

  const prioritySelect = (className?: string) => (
    <Select
      label="Priority"
      emptyLabel="All"
      value={filters.priority}
      onChange={(value) => onFilterChange("priority", value)}
      options={PRIORITY_OPTIONS}
      className={className}
    />
  );

  const assigneeSelect = (className?: string) => (
    <Select
      label="Assignee"
      emptyLabel="Anyone"
      value={filters.assigneeId}
      onChange={(value) => onFilterChange("assigneeId", value)}
      options={assigneeOptions}
      className={className}
    />
  );

  const sortSelect = (className?: string) => (
    <Select
      label="Sort"
      value={filters.sort}
      onChange={(value) => onSortChange(value as TaskSort, filters.order)}
      options={SORT_OPTIONS}
      className={className}
    />
  );

  const directionButton = (
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
      className="inline-flex size-10 shrink-0 items-center justify-center rounded-lg border border-line bg-white text-muted hover:bg-surface focus:border-accent focus:ring-2 focus:ring-accent/30 focus:outline-none"
    >
      <SortArrows ascending={filters.order === "asc"} />
    </button>
  );

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        {/* One search box at every width. A second copy behind a breakpoint
            would be a second thing announcing itself as "Search tasks". */}
        <div className="min-w-0 flex-1 md:max-w-xs">
          <Input
            type="search"
            value={searchInput}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search tasks…"
            aria-label="Search tasks"
            leading={<Search className="size-4" />}
          />
        </div>

        <Button
          variant="secondary"
          onClick={() => setSheetOpen(true)}
          className="shrink-0 md:hidden"
        >
          <SlidersHorizontal className="size-4" aria-hidden="true" />
          Filters
          {sheetFilterCount > 0 && (
            <span
              aria-label={`${sheetFilterCount} active`}
              className="inline-flex size-4 items-center justify-center rounded-full bg-ink text-[10px] font-semibold text-white"
            >
              {sheetFilterCount}
            </span>
          )}
        </Button>

        {/* Desktop: the controls themselves, unchanged. */}
        <div className="hidden flex-1 flex-wrap items-center gap-3 md:flex">
          {statusSelect()}
          {prioritySelect()}
          {assigneeSelect()}

          {/* Pushed to the far right, as drawn in section 4. */}
          <div className="ml-auto flex items-center gap-1">
            {sortSelect()}
            {directionButton}
          </div>
        </div>
      </div>

      {activeFilters.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          {activeFilters.map(({ key, value }) => (
            <span
              key={key}
              className="inline-flex h-[22px] items-center gap-1.5 rounded-md border border-line bg-surface px-2 text-xs text-ink"
            >
              <span className="hidden md:inline">{chipPrefix(key)} : </span>
              {chipValue(key, value)}
              <button
                type="button"
                onClick={() => onFilterChange(key, "")}
                // The full wording, at both widths. Dropping the prefix is a
                // saving of space on a small screen, not of meaning.
                aria-label={`Remove filter ${chipLabel(key, value)}`}
                className="text-muted hover:text-ink"
              >
                <X className="size-3.5" aria-hidden="true" />
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

      {/* Every change here is already live behind the sheet — filters live in
          the URL (docs/decisions/0010), so there is nothing held back to
          apply. Hence "Done", not "Apply": a button called Apply that applied
          nothing would be a lie about what just happened. */}
      <Drawer
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        title="Filters"
        description="Changes take effect straight away."
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => {
                onClear();
                setSheetOpen(false);
              }}
              disabled={activeFilters.length === 0}
            >
              Clear all
            </Button>
            <Button onClick={() => setSheetOpen(false)}>Done</Button>
          </>
        }
      >
        <div className="space-y-4">
          {statusSelect("w-full")}
          {prioritySelect("w-full")}
          {assigneeSelect("w-full")}

          <div className="flex items-center gap-2">
            {sortSelect("w-full flex-1")}
            {directionButton}
          </div>
        </div>
      </Drawer>
    </div>
  );
}

// Shows the direction it is actually sorted in, rather than a generic
// up-and-down glyph. The hand-drawn version dimmed one of two arrows to say the
// same thing; a single arrow says it more plainly.
function SortArrows({ ascending }: { ascending: boolean }) {
  const Arrow = ascending ? ArrowUp : ArrowDown;
  return <Arrow className="size-5" aria-hidden="true" />;
}
