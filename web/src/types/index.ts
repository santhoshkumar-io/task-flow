// The shapes the server actually sends. Kept small on purpose: only what a
// screen needs. See server/src/models/ for the full records.

export interface User {
  _id: string;
  name: string;
  email: string;
  createdAt: string;
  updatedAt: string;
}

// The five statuses and four priorities from the design, not the brief's three
// and three. See docs/decisions/0005-five-statuses-four-priorities.md.
export const TASK_STATUSES = [
  "todo",
  "in_progress",
  "in_review",
  "done",
  "blocked",
] as const;

export const TASK_PRIORITIES = ["low", "medium", "high", "urgent"] as const;

export type TaskStatus = (typeof TASK_STATUSES)[number];
export type TaskPriority = (typeof TASK_PRIORITIES)[number];

/** How each status is written on screen. */
export const STATUS_LABELS: Record<TaskStatus, string> = {
  todo: "To Do",
  in_progress: "In Progress",
  in_review: "In Review",
  done: "Done",
  blocked: "Blocked",
};

export const PRIORITY_LABELS: Record<TaskPriority, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  urgent: "Urgent",
};
