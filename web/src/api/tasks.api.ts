import type {
  Task,
  TaskPage,
  TaskPriority,
  TaskStatus,
} from "../types";
import { api } from "./client";

/** Everything that may appear after the ? on GET /api/tasks. */
export interface TaskQuery {
  page?: number;
  limit?: number;
  q?: string;
  status?: TaskStatus | "";
  priority?: TaskPriority | "";
  /** A real user id, or the exact word "unassigned" to mean nobody. */
  assigneeId?: string;
  sort?: TaskSort;
  order?: "asc" | "desc";
}

export const TASK_SORTS = [
  "updatedAt",
  "createdAt",
  "priority",
  "dueDate",
  "title",
] as const;

export type TaskSort = (typeof TASK_SORTS)[number];

/**
 * Builds the query string, leaving out anything empty.
 *
 * Dropping empties is REQUIRED, not tidiness. listTasksQuerySchema on the
 * server ends in .strict(), so `?status=` is a 400 — an empty string is not
 * one of the five statuses. That strictness is deliberate: it is what stopped
 * the ?status[$ne]=done injection in V4, because Express 5's simple query
 * parser reads that as a key literally named "status[$ne]" and without
 * .strict() Zod would quietly drop it and answer 200 with everything.
 *
 * So the client has to send only keys that carry a real value.
 */
export function toSearchParams(query: TaskQuery): string {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === "") continue;
    params.set(key, String(value));
  }

  const queryString = params.toString();
  return queryString ? `?${queryString}` : "";
}

// No wrapper object on this one — the list route returns the page shape at the
// top level. See server/src/modules/tasks/task.controller.ts.
export function listTasks(
  query: TaskQuery,
  signal?: AbortSignal,
): Promise<TaskPage> {
  return api.get<TaskPage>(`/tasks${toSearchParams(query)}`, { signal });
}

export interface CreateTaskPayload {
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  assigneeId?: string | null;
  dueDate?: string | null;
}

export async function createTask(payload: CreateTaskPayload): Promise<Task> {
  // This one IS wrapped: POST /api/tasks answers { task }.
  const { task } = await api.post<{ task: Task }>("/tasks", payload);
  return task;
}
