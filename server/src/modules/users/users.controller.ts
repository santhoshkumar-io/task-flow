import type { Request, Response } from "express";
import * as usersService from "./users.service.js";

export async function list(_req: Request, res: Response) {
  const users = await usersService.listUsers();
  res.json({ users });
}

export async function stats(_req: Request, res: Response) {
  res.json({ stats: await usersService.listUserStats() });
}
