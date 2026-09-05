import { Types } from "mongoose";
import { AppError } from "../../lib/AppError.js";
import { escapeRegex } from "../../lib/escapeRegex.js";
import { nextTaskKey } from "../../models/counter.model.js";
import { TaskModel, type TaskDocument } from "../../models/task.model.js";
import { UserModel } from "../../models/user.model.js";
import type {
  CreateTaskInput,
  ListTasksQuery,
  UpdateTaskInput,
} from "./task.schema.js";

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

export interface TaskPage {
  items: TaskDocument[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
}

export async function list(query: ListTasksQuery): Promise<TaskPage> {
  const filter = buildFilter(query);
  const skip = (query.page - 1) * query.limit;

  // "priority" the word sorts alphabetically and meaninglessly. The stored
  // rank number is what actually orders low → medium → high → urgent.
  const sortField = query.sort === "priority" ? "priorityRank" : query.sort;
  const direction = query.order === "asc" ? 1 : -1;

  // Two questions, one round trip. The page of records and the total the
  // design's "Showing 1–10 of 42 tasks" line needs. Running them one after the
  // other would take twice as long for no reason.
  const [items, total] = await Promise.all([
    TaskModel.find(filter)
      .sort({ [sortField]: direction, _id: direction })
      .skip(skip)
      .limit(query.limit)
      .populate(WITH_PEOPLE),
    TaskModel.countDocuments(filter),
  ]);

  return {
    items,
    page: query.page,
    limit: query.limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / query.limit)),
    hasMore: skip + items.length < total,
  };
}

// The four numbers on the dashboard, from ONE pass over the collection rather
// than four separate counts.
export async function getStats(): Promise<{
  total: number;
  todo: number;
  inProgress: number;
  done: number;
}> {
  const rows = await TaskModel.aggregate<{ _id: string; count: number }>([
    { $group: { _id: "$status", count: { $sum: 1 } } },
  ]);

  const byStatus = new Map(rows.map((row) => [row._id, row.count]));
  const countOf = (status: string) => byStatus.get(status) ?? 0;

  return {
    total: rows.reduce((sum, row) => sum + row.count, 0),
    todo: countOf("todo"),
    inProgress: countOf("in_progress"),
    done: countOf("done"),
  };
}

function buildFilter(query: ListTasksQuery): Record<string, unknown> {
  const filter: Record<string, unknown> = {};

  if (query.status) filter.status = query.status;
  if (query.priority) filter.priority = query.priority;

  if (query.assigneeId) {
    filter.assigneeId =
      query.assigneeId === "unassigned"
        ? null
        : new Types.ObjectId(query.assigneeId);
  }

  if (query.q) {
    // A regular expression rather than MongoDB's text index, because a text
    // index matches whole words only — "log" would never find "login", which
    // is exactly what someone typing into a search box expects.
    //
    // The honest cost: an unanchored pattern cannot use an index, so this
    // scans. At this size that is milliseconds. Past roughly ten thousand
    // tasks the answer is a text index or a real search engine.
    const pattern = new RegExp(escapeRegex(query.q), "i");
    filter.$or = [
      { title: pattern },
      { description: pattern },
      // So typing TF-18 finds that one task.
      { key: pattern },
    ];
  }

  return filter;
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
