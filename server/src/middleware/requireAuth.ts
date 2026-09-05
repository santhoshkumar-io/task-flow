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
    const user = await UserModel.findById(payload.sub);
    if (!user) {
      return next(unauthorized);
    }

    req.user = user;
    return next();
  } catch (error) {
    return next(error);
  }
}
