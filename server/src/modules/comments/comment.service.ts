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

/**
 * Edit a comment. Only its author may.
 *
 * A 404 rather than a 403 for anybody else, exactly as deleting somebody else's
 * task does — see docs/decisions/0006. Telling a stranger "that exists but you
 * may not touch it" confirms the comment is there; the same answer for "no such
 * comment" and "not yours" tells them nothing either way.
 *
 * The taskId is part of the lookup, so a comment id from one task cannot be
 * edited through another task's URL.
 */
export async function update(
  taskId: string,
  commentId: string,
  authorId: Types.ObjectId,
  body: string,
): Promise<CommentDocument> {
  await assertTaskExists(taskId);

  const comment = await CommentModel.findOne({
    _id: commentId,
    taskId,
    authorId,
  });

  if (!comment) {
    throw AppError.notFound("Comment not found");
  }

  comment.body = body;
  await comment.save();

  return comment.populate(WITH_AUTHOR);
}

/** Delete a comment. Author only, and 404 for everybody else. */
export async function remove(
  taskId: string,
  commentId: string,
  authorId: Types.ObjectId,
): Promise<void> {
  await assertTaskExists(taskId);

  const result = await CommentModel.deleteOne({
    _id: commentId,
    taskId,
    authorId,
  });

  // deletedCount tells the two failures apart from success without a second
  // query: nothing matched means either no such comment or not this person's,
  // and both answer the same way.
  if (result.deletedCount === 0) {
    throw AppError.notFound("Comment not found");
  }
}
