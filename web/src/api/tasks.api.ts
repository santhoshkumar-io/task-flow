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

/**
 * One task, plus how many comments it has.
 *
 * The count comes back with the task rather than from a separate request
 * because the delete dialog has to name a real number — *"and its 4 comments
 * will be permanently removed"*. V5 added it to this route for exactly that.
 */
export interface TaskDetail {
  task: Task;
  commentCount: number;
}

export function getTask(id: string, signal?: AbortSignal): Promise<TaskDetail> {
  return api.get<TaskDetail>(`/tasks/${id}`, { signal });
}

/**
 * Every field is optional: PATCH means "change these", not "replace the whole
 * record". Sending only what changed is what stops one person's save wiping a
 * field somebody else edited a second earlier.
 */
export interface UpdateTaskPayload {
  title?: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  assigneeId?: string | null;
  dueDate?: string | null;
}

export async function updateTask(
  id: string,
  payload: UpdateTaskPayload,
): Promise<Task> {
  const { task } = await api.patch<{ task: Task }>(`/tasks/${id}`, payload);
  return task;
}

// 204 with no body. Only the creator may do this; for anyone else the server
// answers 404 rather than 403, so probing ids tells an attacker nothing.
// See docs/decisions/0006-anyone-edits-creator-deletes.md.
export function deleteTask(id: string): Promise<void> {
  return api.delete<void>(`/tasks/${id}`);
}
