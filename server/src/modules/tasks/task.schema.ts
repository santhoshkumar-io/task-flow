import { z } from "zod";
import { TASK_PRIORITIES, TASK_STATUSES } from "../../models/task.model.js";

// What valid input looks like. Checked on the server no matter what the
// frontend does, because anyone can send a request with curl.
//
// These schemas are a list of the fields we ACCEPT, not a filter over the
// fields we reject. Zod builds a new object containing only the keys it was
// told about, so `creatorId` and `key` are not ignored — they stop existing
// before the service ever sees them. A filter can be forgotten when a field is
// added later; a list of allowed fields fails closed.

const objectId = z
  .string()
  .regex(/^[0-9a-fA-F]{24}$/, "Not a valid id");

// The wording is the design's, from the create drawer's error state in
// 03-DESIGN-REFERENCE.md section 5. Set on the type as well as on min(1),
// because a missing field never reaches the length check — it fails as the
// wrong type first, and Zod's default wording for that is unreadable.
const title = z
  .string({ error: "Task title is required" })
  .trim()
  .min(1, "Task title is required")
  .max(200, "Title must be 200 characters or fewer");
const description = z.string().trim().max(5000).optional();
const status = z.enum(TASK_STATUSES);
const priority = z.enum(TASK_PRIORITIES);

// Accepts an ISO date string or null (to clear the date).
const dueDate = z.coerce.date().nullable().optional();

export const createTaskSchema = z
  .object({
    title,
    description,
    status: status.default("todo"),
    priority: priority.default("medium"),
    dueDate,
    assigneeId: objectId.nullable().optional(),
  })
  .refine(
    (value) => {
      if (!value.dueDate) return true;
      // Compared against the start of today, not the current moment, so
      // "today" is always an acceptable due date.
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);
      return value.dueDate >= startOfToday;
    },
    {
      // The design's exact wording — 03-DESIGN-REFERENCE.md sections 3 and 6.
      message: "Due date can't be in the past.",
      path: ["dueDate"],
    },
  );

export const updateTaskSchema = z
  .object({
    title: title.optional(),
    description,
    status: status.optional(),
    priority: priority.optional(),
    dueDate,
    assigneeId: objectId.nullable().optional(),
  })
  // A PATCH with {} would otherwise be a silent no-op that looks like success.
  .refine((value) => Object.keys(value).length > 0, {
    message: "Send at least one field to change",
  });

// The past-date rule is deliberately NOT repeated here. Editing an
// already-overdue task — changing its status, reassigning it — must not be
// blocked by a date that was fine when it was set.

export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
