import { z } from "zod";
import { TASK_PRIORITIES, TASK_STATUSES } from "../types";

// The SAME rules as server/src/modules/auth/auth.schema.ts.
//
// Checking here is speed and kindness, not safety. It tells the person their
// password is too short without a round trip. The server's copy is the one that
// protects the data, because anyone can send a request without this UI.
//
// Both sides run Zod 4 so the rules genuinely can be kept identical.

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
  rememberMe: z.boolean(),
});

export const registerSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    // bcrypt only reads the first 72 bytes, so anything longer would be
    // silently ignored. The server says no, and so does this.
    .max(72, "Password must be 72 characters or fewer"),
  rememberMe: z.boolean(),
});

export type LoginValues = z.infer<typeof loginSchema>;
export type RegisterValues = z.infer<typeof registerSchema>;

// The SAME rules as server/src/modules/tasks/task.schema.ts, with one
// deliberate difference noted below.
export const DESCRIPTION_LIMIT = 2000;

export const createTaskSchema = z.object({
  // The wording is the design's, from the drawer's error state in section 5,
  // and it is the wording the server sends back for the same mistake.
  title: z
    .string()
    .trim()
    .min(1, "Task title is required")
    .max(200, "Title must be 200 characters or fewer"),

  // The server allows 5000. The design draws the counter as "0 / 2000", so
  // this is the tighter of the two. Tighter is safe — the server would accept
  // anything this lets through. Looser would not be: it would let somebody
  // fill the box and then be rejected after the round trip.
  description: z
    .string()
    .trim()
    .max(DESCRIPTION_LIMIT, `Description must be ${DESCRIPTION_LIMIT} characters or fewer`),

  status: z.enum(TASK_STATUSES),
  priority: z.enum(TASK_PRIORITIES),

  // "" is the empty choice in the dropdown; it becomes null on the way out.
  assigneeId: z.string(),
});

export type CreateTaskValues = z.infer<typeof createTaskSchema>;

// The edit form. Same fields as create, plus a due date.
//
// The past-date rule is NOT here, and that is deliberate on both sides. The
// server dropped it from updateTaskSchema so an already-overdue task can still
// be moved to Done; putting it back here would make every overdue task
// permanently uneditable — the form would be invalid the moment it loaded.
//
// The form checks it only when the date field has actually been CHANGED, which
// is a question about the edit rather than about the value. See
// isPastDueDate below and TaskEditForm.
export const editTaskSchema = createTaskSchema.extend({
  /** "" means no due date. An <input type="date"> gives "" when cleared. */
  dueDate: z.string(),
});

export type EditTaskValues = z.infer<typeof editTaskSchema>;

/**
 * True when a date string is before the start of today.
 *
 * Compared against the START of today, not this moment, so a task due today is
 * never "in the past" — the same rule the server applies on create.
 */
export function isPastDueDate(value: string): boolean {
  if (!value) return false;

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  return new Date(`${value}T00:00:00`) < startOfToday;
}

/** The design's exact wording, from section 6. */
export const PAST_DUE_DATE_MESSAGE = "Due date can't be in the past.";

export const COMMENT_LIMIT = 2000;

// Mirrors server/src/modules/comments/comment.schema.ts, wording included, so
// an empty comment is refused with the same sentence on both sides.
export const commentSchema = z.object({
  body: z
    .string()
    .trim()
    .min(1, "Comment can't be empty")
    .max(COMMENT_LIMIT, `Comment must be ${COMMENT_LIMIT} characters or fewer`),
});

export type CommentValues = z.infer<typeof commentSchema>;
