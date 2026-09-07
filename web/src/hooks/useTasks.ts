import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { listUsers } from "../api/users.api";
import { listTasks, type TaskQuery } from "../api/tasks.api";

/**
 * The task list.
 *
 * The cache key includes the filters, so a different filter set is a different
 * cached answer: change the status and it fetches, go back to the old one and
 * the answer is already there.
 *
 * keepPreviousData is what makes paging feel smooth. Without it the list
 * blanks to a skeleton for every page change; with it the current page stays
 * on screen, dimmed, until the next one arrives. `isPlaceholderData` tells the
 * screen which of the two it is looking at.
 */
export function useTasks(query: TaskQuery) {
  return useQuery({
    queryKey: ["tasks", query],
    queryFn: ({ signal }) => listTasks(query, signal),
    placeholderData: keepPreviousData,
  });
}

/**
 * Everyone who can be assigned a task.
 *
 * Long staleTime on purpose: the team list barely changes, and it is read by
 * both the filter bar and the create drawer. One request covers both for the
 * whole visit instead of one per mount.
 */
export function useUsers() {
  return useQuery({
    queryKey: ["users"],
    queryFn: listUsers,
    staleTime: 5 * 60 * 1000,
  });
}
