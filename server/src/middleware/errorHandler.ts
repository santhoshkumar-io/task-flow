import type { NextFunction, Request, Response } from "express";
import mongoose from "mongoose";
import { AppError } from "../lib/AppError.js";
import { isProduction } from "../config/env.js";

// Every failure leaves the API looking the same:
//   { "error": { "code": "NOT_FOUND", "message": "Task not found" } }
// so the frontend needs one piece of error handling, not one per screen.

export function notFoundHandler(req: Request, _res: Response, next: NextFunction) {
  next(AppError.notFound(`No route for ${req.method} ${req.originalUrl}`));
}

// Express recognises an error handler by its FOUR arguments, not by its name.
// Dropping `next` here would silently turn it back into a normal handler that
// never runs, so it stays even though it is unused.
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
) {
  const { status, code, message } = describe(err);

  // Anything the client did not cause is worth seeing in the server log.
  if (status >= 500) {
    console.error("[error]", err);
  }

  const body: Record<string, unknown> = { error: { code, message } };

  // A stack trace tells an attacker your folder layout and library versions.
  // It is useful on a laptop and never acceptable in production.
  if (!isProduction && err instanceof Error && err.stack) {
    (body.error as Record<string, unknown>).stack = err.stack.split("\n");
  }

  res.status(status).json(body);
}

function describe(err: unknown): { status: number; code: string; message: string } {
  if (err instanceof AppError) {
    return { status: err.status, code: err.code, message: err.message };
  }

  // Mongoose could not reach the database within its buffer window. The
  // request failed, but the process is fine and should say so honestly.
  if (err instanceof mongoose.Error.MongooseServerSelectionError) {
    return {
      status: 503,
      code: "DATABASE_UNAVAILABLE",
      message: "The database is not reachable right now.",
    };
  }

  if (err instanceof SyntaxError && "body" in err) {
    return {
      status: 400,
      code: "INVALID_JSON",
      message: "The request body is not valid JSON.",
    };
  }

  // Anything unrecognised is our bug. Say nothing specific: the real detail
  // went to the server log above.
  return {
    status: 500,
    code: "INTERNAL_ERROR",
    message: "Something went wrong on our side.",
  };
}
