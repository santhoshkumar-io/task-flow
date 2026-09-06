import type { Request, Response } from "express";
import { currentUser } from "../../lib/currentUser.js";
import {
  acceptInviteSchema,
  changeRoleSchema,
  inviteSchema,
  renameWorkspaceSchema,
  updateProfileSchema,
} from "./users.schema.js";
import * as usersService from "./users.service.js";

export async function list(_req: Request, res: Response) {
  const users = await usersService.listUsers();
  res.json({ users });
}

export async function stats(_req: Request, res: Response) {
  res.json({ stats: await usersService.listUserStats() });
}

/** Member count and seats — the Team footer and the Settings account card. */
export async function workspace(_req: Request, res: Response) {
  res.json({ workspace: await usersService.getWorkspace() });
}

export async function invite(req: Request, res: Response) {
  const input = inviteSchema.parse(req.body);
  await usersService.invite(input.email, input.name, input.role);

  // 202, not 201: the member record exists, but nothing has happened yet from
  // the invited person's point of view until they open the email.
  res.status(202).json({
    message: `An invitation is on its way to ${input.email}.`,
  });
}

export async function acceptInvite(req: Request, res: Response) {
  const input = acceptInviteSchema.parse(req.body);
  await usersService.acceptInvite(input.token, input.password);

  // Deliberately not signed in, for the same reason a password reset is not:
  // whoever opened the email may not be the person it was meant for.
  res.json({ message: "Your account is ready. Please sign in." });
}

export async function changeRole(req: Request, res: Response) {
  const input = changeRoleSchema.parse(req.body);
  await usersService.changeRole(String(req.params.id), input.role);

  res.status(204).end();
}

export async function removeMember(req: Request, res: Response) {
  await usersService.removeMember(String(req.params.id), currentUser(req)._id);

  res.status(204).end();
}

export async function updateMe(req: Request, res: Response) {
  const input = updateProfileSchema.parse(req.body);
  const user = await usersService.updateProfile(currentUser(req)._id, input);

  res.json({ user });
}

export async function renameWorkspace(req: Request, res: Response) {
  const input = renameWorkspaceSchema.parse(req.body);
  await usersService.renameWorkspace(input.name);

  res.json({ workspace: await usersService.getWorkspace() });
}
