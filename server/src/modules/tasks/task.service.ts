import { Types } from "mongoose";
import { AppError } from "../../lib/AppError.js";
import { nextTaskKey } from "../../models/counter.model.js";
import { TaskModel, type TaskDocument } from "../../models/task.model.js";
import { UserModel } from "../../models/user.model.js";
import type { CreateTaskInput, UpdateTaskInput } from "./task.schema.js";

// The rules. Knows nothing about HTTP: no request, no response, no status
// codes beyond what AppError carries.

// The frontend needs the assignee's NAME, not just an id. One extra query for
// the whole response, not one per task.
const WITH_PEOPLE = [
  { path: "assigneeId", select: "name email" },
  { path: "creatorId", select: "name email" },
];

export async function create(
  input: CreateTaskInput,
  creatorId: Types.ObjectId,
): Promise<TaskDocument> {
  await assertAssigneeExists(input.assigneeId);

  const task = await TaskModel.create({
    key: await nextTaskKey(),
    title: input.title,
    description: input.description ?? "",
    status: input.status,
    priority: input.priority,
    dueDate: input.dueDate ?? null,
    assigneeId: input.assigneeId ? new Types.ObjectId(input.assigneeId) : null,
    // Always the logged-in person. The body is never consulted for this, so
    // sending creatorId in the request changes nothing.
    creatorId,
  });

  return task.populate(WITH_PEOPLE);
}

export async function getById(id: string): Promise<TaskDocument> {
  const task = await TaskModel.findById(id).populate(WITH_PEOPLE);

  if (!task) {
    throw AppError.notFound("Task not found");
  }

  return task;
}

// Anyone logged in may edit. It is a small team tool, and changing a status or
// a priority is the daily work — see docs/decisions/0006-anyone-edits-creator-deletes.md.
export async function update(
  id: string,
  input: UpdateTaskInput,
): Promise<TaskDocument> {
  await assertAssigneeExists(input.assigneeId);

  const changes: Record<string, unknown> = { ...input };

  if (input.assigneeId !== undefined) {
    changes.assigneeId = input.assigneeId
      ? new Types.ObjectId(input.assigneeId)
      : null;
  }

  const task = await TaskModel.findByIdAndUpdate(id, changes, {
    // The record as it is AFTER the change, so the reply shows the new values.
    returnDocument: "after",
    runValidators: true,
  }).populate(WITH_PEOPLE);

  if (!task) {
    throw AppError.notFound("Task not found");
  }

  return task;
}

// Only the creator may delete, and someone else's task answers 404 rather than
// 403. A 403 would confirm the id exists, which lets an attacker map real ids
// by probing. 404 tells them nothing either way.
export async function remove(
  id: string,
  requesterId: Types.ObjectId,
): Promise<void> {
  const task = await TaskModel.findById(id);

  if (!task || !task.creatorId.equals(requesterId)) {
    throw AppError.notFound("Task not found");
  }

  await task.deleteOne();
}

// A well-formed id that belongs to no user is 422, not 400: the request was
// understood and correctly shaped, the value in it was just wrong.
async function assertAssigneeExists(assigneeId?: string | null): Promise<void> {
  if (!assigneeId) return;

  const exists = await UserModel.exists({ _id: assigneeId });

  if (!exists) {
    throw new AppError(
      422,
      "ASSIGNEE_NOT_FOUND",
      "That person does not exist",
    );
  }
}
