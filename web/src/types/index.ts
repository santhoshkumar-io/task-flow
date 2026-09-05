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

// A person as they appear ON another record. The server stores only an id and
// calls .populate() to fill in these three fields, so `assigneeId` on a task
// arrives as this object and NOT as a string. Typing it as a string is the
// mistake that silently renders "[object Object]".
export interface PersonRef {
  _id: string;
  name: string;
  email: string;
}

export interface Task {
  _id: string;
  /** The short readable id from the design: TF-118. */
  key: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  /** Null when nobody is assigned — the "Unassigned" case the table must draw. */
  assigneeId: PersonRef | null;
  creatorId: PersonRef;
  dueDate: string | null;
  createdAt: string;
  updatedAt: string;
}

// Dates arrive as ISO strings, not Date objects: JSON has no date type. They
// are turned into a Date at the moment of formatting, in lib/time.ts.

/**
 * Exactly what GET /api/tasks answers with. Note there is no wrapper object —
 * unlike POST /api/tasks ({ task }) and GET /api/users ({ users }), the list
 * route returns this shape at the top level.
 */
export interface TaskPage {
  items: Task[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  /** True when more pages exist — what the mobile "Load more" button reads. */
  hasMore: boolean;
}
