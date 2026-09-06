import type { NextFunction, Request, Response } from "express";
import { AppError } from "../lib/AppError.js";
import { AUTH_COOKIE_NAME } from "../lib/cookie.js";
import { verifyToken } from "../lib/token.js";
import { UserModel } from "../models/user.model.js";

// Every failure here is a 401: "I do not know who you are". Not a 403, which
// would mean "I know who you are and you still may not" — that is a different
// situation and it arrives in V3. Never a 500: a pass with one character
// changed is a normal thing to receive, not a crash.
export async function requireAuth(
  req: Request,
  _res: Response,
  next: NextFunction,
) {
  const unauthorized = new AppError(401, "UNAUTHORIZED", "You must be logged in");

  const token = req.cookies?.[AUTH_COOKIE_NAME];
  if (typeof token !== "string" || token.length === 0) {
    return next(unauthorized);
  }

  const payload = verifyToken(token);
  if (!payload) {
    return next(unauthorized);
  }

  try {
    // Costs one database read per request, and buys this: someone whose account
    // was deleted stops working immediately, instead of staying logged in for
    // however many days are left on their pass.
    const user = await UserModel.findById(payload.sub).select(
      "+passwordChangedAt",
    );
    if (!user) {
      return next(unauthorized);
    }

    // A pass issued BEFORE the password last changed is no longer honoured.
    //
    // This is what makes resetting a password mean something. A signed pass
    // cannot be recalled — it stays valid for its seven days no matter what we
    // do — so the only defence is to stop accepting it. Without this check,
    // somebody who reset their password because a session was stolen would
    // have changed nothing at all for the thief.
    //
    // iat is in whole seconds, so it is compared against a passwordChangedAt
    // rounded down the same way. Without that, a pass issued in the same second
    // as the change looks older than it by a fraction and the person who just
    // reset their password is thrown out immediately.
    if (user.passwordChangedAt) {
      const changedAt = Math.floor(user.passwordChangedAt.getTime() / 1000);
      if (payload.iat < changedAt) {
        return next(unauthorized);
      }
    }

    req.user = user;
    return next();
  } catch (error) {
    return next(error);
  }
}
