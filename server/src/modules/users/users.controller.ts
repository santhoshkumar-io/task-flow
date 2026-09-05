import type { Request, Response } from "express";
import * as usersService from "./users.service.js";

export async function list(_req: Request, res: Response) {
  const users = await usersService.listUsers();
  res.json({ users });
}
