import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { TASK_SORTS, type TaskQuery, type TaskSort } from "../api/tasks.api";
import {
  TASK_PRIORITIES,
  TASK_STATUSES,
  type TaskPriority,
  type TaskStatus,
} from "../types";
import { useDebounce } from "./useDebounce";

// Every filter lives in the URL, not in useState.
//
// ?status=todo&page=2 in the address bar buys three things at once: the back
// button works, a refresh keeps the view, and the view is a link somebody can
// send. Component state throws all three away and gains nothing.
// See docs/decisions/0010-filters-in-the-url.md.
//
// The search box is the one exception. It keeps its own text so typing feels
// instant, and only the DEBOUNCED value is written to the URL — otherwise
// every keystroke would be a history entry and the back button would walk
// backwards through "logi", "log", "lo", "l".

export interface TaskFilters {
  q: string;
  status: TaskStatus | "";
  priority: TaskPriority | "";
  /** A user id, the word "unassigned", or "" for anyone. */
  assigneeId: string;
  sort: TaskSort;
  order: "asc" | "desc";
  page: number;
}

/** The design's default: last updated, newest first. */
const DEFAULT_SORT: TaskSort = "updatedAt";
const DEFAULT_ORDER = "desc";
export const PAGE_SIZE = 10;

/** Which keys count as "a filter" for the chips and for Clear all. */
const FILTER_KEYS = ["q", "status", "priority", "assigneeId"] as const;
export type FilterKey = (typeof FILTER_KEYS)[number];

export function useTaskFilters() {
  const [searchParams, setSearchParams] = useSearchParams();

  // Read straight from the URL every render. Nothing is copied into state, so
  // there is no second source of truth that can drift out of step with the
  // address bar.
  const filters = useMemo<TaskFilters>(() => {
    return {
      q: searchParams.get("q") ?? "",
      status: oneOf(searchParams.get("status"), TASK_STATUSES),
      priority: oneOf(searchParams.get("priority"), TASK_PRIORITIES),
      assigneeId: searchParams.get("assigneeId") ?? "",
      sort: oneOf(searchParams.get("sort"), TASK_SORTS) || DEFAULT_SORT,
      order: searchParams.get("order") === "asc" ? "asc" : DEFAULT_ORDER,
      page: toPage(searchParams.get("page")),
    };
  }, [searchParams]);

  // What is actually in the box, updated on every keystroke.
  const [searchInput, setSearchInput] = useState(filters.q);
  const debouncedSearch = useDebounce(searchInput, 300);

  // Someone pressing back, or clicking a chip's ×, changes the URL without
  // touching the box, so the text has to be put back in step with it.
  //
  // Done by comparing DURING RENDER rather than in an effect. React allows a
  // conditional setState here and re-runs this component before touching the
  // screen, so nothing is ever painted with the stale text. An effect would
  // paint the old value first and correct it on a second pass — a visible
  // flicker, and the cascading render oxlint warns about.
  const [lastUrlQ, setLastUrlQ] = useState(filters.q);
  if (lastUrlQ !== filters.q) {
    setLastUrlQ(filters.q);
    setSearchInput(filters.q);
  }

  const writeParams = useCallback(
    (
      change: Partial<Record<keyof TaskFilters, string | number>>,
      options?: { replace?: boolean },
    ) => {
      setSearchParams(
        (previous) => {
          const next = new URLSearchParams(previous);

          for (const [key, value] of Object.entries(change)) {
            const text = String(value ?? "");
            // A default is not written down. Keeping ?sort=updatedAt&order=desc
            // out of the URL is what leaves a plain /tasks looking plain.
            const isDefault =
              (key === "sort" && text === DEFAULT_SORT) ||
              (key === "order" && text === DEFAULT_ORDER) ||
              (key === "page" && text === "1");

            if (text === "" || isDefault) {
              next.delete(key);
            } else {
              next.set(key, text);
            }
          }

          return next;
        },
        { replace: options?.replace ?? false },
      );
    },
    [setSearchParams],
  );

  // The debounced search text catches up with the URL 300ms after typing
  // stops. `replace` keeps the history clean: one back press should undo the
  // whole search, not one letter of it.
  useEffect(() => {
    if (debouncedSearch === filters.q) return;

    writeParams({ q: debouncedSearch, page: 1 }, { replace: true });
  }, [debouncedSearch, filters.q, writeParams]);

  const setFilter = useCallback(
    (key: FilterKey, value: string) => {
      if (key === "q") setSearchInput(value);
      // Back to page 1. Staying on page 4 after narrowing to six results is
      // an empty screen that looks like a bug.
      writeParams({ [key]: value, page: 1 });
    },
    [writeParams],
  );

  const setSort = useCallback(
    (sort: TaskSort, order: "asc" | "desc") => {
      writeParams({ sort, order, page: 1 });
    },
    [writeParams],
  );

  const setPage = useCallback(
    (page: number) => {
      writeParams({ page });
    },
    [writeParams],
  );

  const clearFilters = useCallback(() => {
    setSearchInput("");
    writeParams({ q: "", status: "", priority: "", assigneeId: "", page: 1 });
  }, [writeParams]);

  // Only the filters, never sort or page — "Clear all" should not silently
  // reset the sort order the user chose.
  const activeFilters = useMemo(
    () =>
      FILTER_KEYS.filter((key) => filters[key] !== "").map((key) => ({
        key,
        value: filters[key] as string,
      })),
    [filters],
  );

  /** Exactly what goes to the API. */
  const query = useMemo<TaskQuery>(
    () => ({
      page: filters.page,
      limit: PAGE_SIZE,
      q: filters.q,
      status: filters.status,
      priority: filters.priority,
      assigneeId: filters.assigneeId,
      sort: filters.sort,
      order: filters.order,
    }),
    [filters],
  );

  return {
    filters,
    query,
    searchInput,
    setSearchInput,
    setFilter,
    setSort,
    setPage,
    clearFilters,
    activeFilters,
    hasActiveFilters: activeFilters.length > 0,
  };
}

// A URL is typed by hand as often as it is clicked. Anything that is not one
// of the values we allow is treated as absent rather than passed to the API,
// so ?status=nonsense shows the full list instead of a 400.
function oneOf<T extends string>(
  value: string | null,
  allowed: readonly T[],
): T | "" {
  return value && (allowed as readonly string[]).includes(value)
    ? (value as T)
    : "";
}

function toPage(value: string | null): number {
  const page = Number(value);
  return Number.isInteger(page) && page > 0 ? page : 1;
}
