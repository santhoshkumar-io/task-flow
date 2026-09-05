import type { Types } from "mongoose";
import { AppError } from "../../lib/AppError.js";
import { ActivityModel, type ActivityDocument } from "../../models/activity.model.js";
import { CommentModel, type CommentDocument } from "../../models/comment.model.js";
import { TaskModel } from "../../models/task.model.js";
import type { CreateCommentInput } from "./comment.schema.js";

// The rules. Knows nothing about HTTP.

const WITH_AUTHOR = { path: "authorId", select: "name email" };
const WITH_ACTOR = { path: "actorId", select: "name email" };

// MongoDB has no foreign keys. Nothing stops us inserting a comment whose
// taskId points at a task that does not exist — it would just sit there, unread
// by any screen, forever. So we check first, every time.
async function assertTaskExists(taskId: string): Promise<void> {
  const exists = await TaskModel.exists({ _id: taskId });

  if (!exists) {
    throw AppError.notFound("Task not found");
  }
}

export async function listForTask(taskId: string): Promise<CommentDocument[]> {
  await assertTaskExists(taskId);

  // Oldest first: a conversation reads top to bottom.
  return CommentModel.find({ taskId })
    .sort({ createdAt: 1 })
    .populate(WITH_AUTHOR);
}

export async function create(
  taskId: string,
  input: CreateCommentInput,
  authorId: Types.ObjectId,
): Promise<CommentDocument> {
  await assertTaskExists(taskId);

  const comment = await CommentModel.create({
    taskId,
    // Always the logged-in person. The body is never consulted for this.
    authorId,
    body: input.body,
  });

  return comment.populate(WITH_AUTHOR);
}

// Newest first, because the design's Activity card shows the most recent change
// at the top. Capped at 20 so a heavily edited task cannot return a huge reply.
export async function listActivityForTask(
  taskId: string,
): Promise<ActivityDocument[]> {
  await assertTaskExists(taskId);

  return ActivityModel.find({ taskId })
    .sort({ createdAt: -1 })
    .limit(20)
    .populate(WITH_ACTOR);
}
