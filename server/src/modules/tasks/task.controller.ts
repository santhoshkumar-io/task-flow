import type { Request, Response } from "express";
import { currentUser } from "../../lib/currentUser.js";
import {
  createTaskSchema,
  listTasksQuerySchema,
  updateTaskSchema,
} from "./task.schema.js";
import * as taskService from "./task.service.js";

// Knows about HTTP and nothing else: reads the request, calls a rule, sets a
// status. No business logic lives here.

export async function create(req: Request, res: Response) {
  const input = createTaskSchema.parse(req.body);
  const task = await taskService.create(input, currentUser(req)._id);

  res.status(201).json({ task });
}

export async function list(req: Request, res: Response) {
  const query = listTasksQuerySchema.parse(req.query);
  const page = await taskService.list(query);

  res.json(page);
}

export async function stats(_req: Request, res: Response) {
  res.json({ stats: await taskService.getStats() });
}

export async function getById(req: Request, res: Response) {
  const { task, commentCount } = await taskService.getById(
    req.params.id as string,
  );

  res.json({ task, commentCount });
}

export async function update(req: Request, res: Response) {
  const input = updateTaskSchema.parse(req.body);
  const task = await taskService.update(
    req.params.id as string,
    input,
    currentUser(req)._id,
  );

  res.json({ task });
}

export async function remove(req: Request, res: Response) {
  const me = currentUser(req);
  await taskService.remove(req.params.id as string, me._id, me.role);

  // 204: deleted, and there is nothing left to send back.
  res.status(204).end();
}
