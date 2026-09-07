// The shapes the server actually sends. Kept small on purpose: only what a
// screen needs. See server/src/models/ for the full records.

// The design's Team screen shows Admin, Engineer, Designer and Product Manager.
// V9 refused to draw the column because roles did not exist; they do now, and
// one of them changes behaviour — an admin may delete anybody's task.
// See docs/decisions/0021-roles-are-real.md.
export const USER_ROLES = [
  "admin",
  "engineer",
  "designer",
  "product_manager",
] as const;

export type UserRole = (typeof USER_ROLES)[number];

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: "Admin",
  engineer: "Engineer",
  designer: "Designer",
  product_manager: "Product Manager",
};

/** Somebody invited exists as a record with no password, and cannot sign in. */
export const USER_STATUSES = ["active", "invited"] as const;

export type UserStatus = (typeof USER_STATUSES)[number];

export const USER_STATUS_LABELS: Record<UserStatus, string> = {
  active: "Active",
  invited: "Invited",
};

export interface User {
  _id: string;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  /** An IANA name such as "Asia/Kolkata". Null when never set. */
  timezone?: string | null;
  notifyOnAssignment?: boolean;
  notifyOnMention?: boolean;
  createdAt: string;
  updatedAt: string;
}

/** A row on the Team screen. GET /api/users returns exactly these fields. */
export interface TeamMember {
  _id: string;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  createdAt: string;
}

/** GET /api/users/workspace — the Team footer and the Settings account card. */
export interface Workspace {
  name: string;
  members: number;
  seatLimit: number;
  seatsRemaining: number;
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

export interface Comment {
  _id: string;
  taskId: string;
  authorId: PersonRef;
  body: string;
  createdAt: string;
  updatedAt: string;
}

// The kinds of change the server records. Title and description edits are
// deliberately NOT here — the server only writes a row for these three. That
// gap is why the detail header can only name who last touched a task when the
// newest row lines up with updatedAt; see docs/notes/v8.md.
export const ACTIVITY_TYPES = [
  "created",
  "status_changed",
  "priority_changed",
  "assignee_changed",
] as const;

export type ActivityType = (typeof ACTIVITY_TYPES)[number];

/**
 * The four dashboard counts, from GET /api/tasks/stats.
 *
 * `total` is every task. `todo + inProgress + done` is deliberately LESS than
 * it, because in_review and blocked are real statuses with no card of their
 * own. The card labels say which is which, so nothing claims otherwise.
 */
export interface TaskStats {
  total: number;
  todo: number;
  inProgress: number;
  done: number;
  /** Past their due date and not Done. Never counts a task with no due date. */
  overdue: number;
  /** Created in the last 7 days, and in the 7 before that. */
  createdThisWeek: number;
  createdLastWeek: number;
  /** Not done, due inside the next 7 days. */
  dueThisWeek: number;
  /** Moved INTO done in the last 7 days, from the activity trail. */
  completedThisWeek: number;
}

/** One person's numbers on the Team screen, from GET /api/users/stats. */
export interface UserStats {
  userId: string;
  assigned: number;
  /** Of those, the ones not yet Done — the number in the My Tasks badge. */
  open: number;
  created: number;
  /** null when they have never changed anything — the screen says "Never". */
  lastActiveAt: string | null;
}

export interface Activity {
  _id: string;
  taskId: string;
  actorId: PersonRef;
  type: ActivityType;
  /** Plain text, because one row must describe "todo → done" and
      "unassigned → Sarah Chen" equally well. null means no previous value. */
  from: string | null;
  to: string | null;
  createdAt: string;
}
