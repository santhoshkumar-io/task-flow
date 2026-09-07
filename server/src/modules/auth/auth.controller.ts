import type { Request, Response } from "express";
import { currentUser } from "../../lib/currentUser.js";
import { clearAuthCookie, setAuthCookie } from "../../lib/cookie.js";
import { signToken } from "../../lib/token.js";
import {
  changePasswordSchema,
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
} from "./auth.schema.js";
import * as authService from "./auth.service.js";

// Knows about HTTP and nothing else: reads the request, calls a rule, sets a
// status. No business logic lives here.

export async function register(req: Request, res: Response) {
  const input = registerSchema.parse(req.body);
  const user = await authService.register(input);

  setAuthCookie(res, signToken(user.id), input.rememberMe);

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

export async function forgotPassword(req: Request, res: Response) {
  const input = forgotPasswordSchema.parse(req.body);
  await authService.requestPasswordReset(input.email);

  // THE SAME ANSWER EVERY TIME — whether the address is registered, whether
  // an email was sent, whether sending failed. Any difference here, including
  // a difference in wording, turns this route into a way to find out who has
  // an account. Same reason login says "Invalid email or password" rather than
  // "no such user".
  res.json({
    message:
      "If that email is registered, a reset link is on its way. Check your inbox.",
  });
}

export async function resetPassword(req: Request, res: Response) {
  const input = resetPasswordSchema.parse(req.body);
  await authService.resetPassword(input.token, input.password);

  // Deliberately NOT signed in afterwards, even though we could.
  //
  // Whoever holds the link may not be the account's owner — that is the whole
  // scenario a reset exists for. Making them type the new password once on the
  // login screen proves they have it, rather than handing a session to whoever
  // opened an email.
  clearAuthCookie(res);

  res.json({ message: "Your password has been changed. Please sign in." });
}

export async function changePassword(req: Request, res: Response) {
  const input = changePasswordSchema.parse(req.body);

  const user = await authService.changePassword(
    currentUser(req)._id,
    input.currentPassword,
    input.newPassword,
  );

  // A FRESH PASS FOR THE CALLER.
  //
  // Changing the password moves passwordChangedAt forward, and requireAuth
  // refuses anything issued before it — including the pass this very request
  // arrived with. Without this line, changing your password on the Settings
  // screen signs you out of the browser you are sitting at, which reads as the
  // app breaking rather than as security working.
  setAuthCookie(res, signToken(user.id));

  res.json({ message: "Your password has been changed." });
}

export async function signOutOtherDevices(req: Request, res: Response) {
  const user = await authService.signOutOtherDevices(currentUser(req)._id);

  // Same reason as above, and here it is the whole point: the button says
  // OTHER devices, so this one has to keep working.
  setAuthCookie(res, signToken(user.id));

  res.json({ message: "Every other session has been signed out." });
}
