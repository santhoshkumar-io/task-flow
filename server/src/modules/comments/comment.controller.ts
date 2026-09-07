import type { Request, Response } from "express";
import { currentUser } from "../../lib/currentUser.js";
import { createCommentSchema, updateCommentSchema } from "./comment.schema.js";
import * as commentService from "./comment.service.js";

// Knows about HTTP and nothing else.

export async function list(req: Request, res: Response) {
  const comments = await commentService.listForTask(taskIdFrom(req));

  res.json({ comments });
}

export async function create(req: Request, res: Response) {
  const input = createCommentSchema.parse(req.body);
  const comment = await commentService.create(
    taskIdFrom(req),
    input,
    currentUser(req)._id,
  );

  res.status(201).json({ comment });
}

export async function listActivity(req: Request, res: Response) {
  const activity = await commentService.listActivityForTask(taskIdFrom(req));

  res.json({ activity });
}

// The router is created with mergeParams: true, which is what makes :taskId
// from the parent path visible here.
function taskIdFrom(req: Request): string {
  return req.params.taskId as string;
}

export async function update(req: Request, res: Response) {
  const input = updateCommentSchema.parse(req.body);

  const comment = await commentService.update(
    String(req.params.taskId),
    String(req.params.commentId),
    currentUser(req)._id,
    input.body,
  );

  res.json({ comment });
}

export async function remove(req: Request, res: Response) {
  await commentService.remove(
    String(req.params.taskId),
    String(req.params.commentId),
    currentUser(req)._id,
  );

  res.status(204).end();
}
