import type { NextFunction, Request, Response } from "express";
import { AppError } from "../lib/AppError.js";

/**
 * Admin only.
 *
 * A 403 here, NOT the 404 that deleting somebody else's task answers with. The
 * two situations are genuinely different: a task id is worth protecting, so
 * "no such task" and "not yours" have to look alike. "You are not an admin" is
 * a fact about the person asking, reveals nothing about anybody else, and a 404
 * would only make the app look broken to them.
 *
 * Always registered after requireAuth — it reads the user that guard attached.
 */
export function requireAdmin(req: Request, _res: Response, next: NextFunction) {
  if (req.user?.role !== "admin") {
    return next(new AppError(403, "FORBIDDEN", "Only an admin can do that"));
  }

  next();
}
