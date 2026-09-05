import type { Request, Response } from "express";
import { clearAuthCookie, setAuthCookie } from "../../lib/cookie.js";
import { signToken } from "../../lib/token.js";
import { loginSchema, registerSchema } from "./auth.schema.js";
import * as authService from "./auth.service.js";

// Knows about HTTP and nothing else: reads the request, calls a rule, sets a
// status. No business logic lives here.

export async function register(req: Request, res: Response) {
  const input = registerSchema.parse(req.body);
  const user = await authService.register(input);

  setAuthCookie(res, signToken(user.id));

  // toJSON on the model strips passwordHash, so this cannot leak it.
  res.status(201).json({ user });
}

export async function login(req: Request, res: Response) {
  const input = loginSchema.parse(req.body);
  const user = await authService.login(input);

  setAuthCookie(res, signToken(user.id), input.rememberMe);

  res.json({ user });
}

export async function logout(_req: Request, res: Response) {
  // The pass itself stays valid until it expires — this only stops the browser
  // sending it. That is the real trade of a signed pass over a stored session,
  // and it is written up in docs/decisions/0001-token-storage.md.
  clearAuthCookie(res);
  res.status(204).end();
}

export async function me(req: Request, res: Response) {
  res.json({ user: req.user });
}
