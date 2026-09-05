import type { NextFunction, Request, Response } from "express";
import mongoose from "mongoose";
import { ZodError } from "zod";
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
  const { status, code, message, fields } = describe(err);

  // Anything the client did not cause is worth seeing in the server log.
  if (status >= 500) {
    console.error("[error]", err);
  }

  const errorBody: Record<string, unknown> = { code, message };
  if (fields) {
    errorBody.fields = fields;
  }
  const body: Record<string, unknown> = { error: errorBody };

  // A stack trace tells an attacker your folder layout and library versions.
  // It is useful on a laptop and never acceptable in production.
  if (!isProduction && err instanceof Error && err.stack) {
    (body.error as Record<string, unknown>).stack = err.stack.split("\n");
  }

  res.status(status).json(body);
}

interface Described {
  status: number;
  code: string;
  message: string;
  fields?: { field: string; message: string }[];
}

function describe(err: unknown): Described {
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

  // Input that failed its Zod check. The client sent something wrong, so this
  // is a 400 and never a 500, and the reply names the fields so a form can show
  // the message beside the right box.
  if (err instanceof ZodError) {
    const fields = err.issues.map((issue) => ({
      field: issue.path.join(".") || "(body)",
      message: issue.message,
    }));
    return {
      status: 400,
      code: "VALIDATION_ERROR",
      message: fields[0]?.message ?? "The request is not valid.",
      fields,
    };
  }

  // Mongoose could not turn a value into the type the model expects — almost
  // always an id like "not-a-real-id" that is not 24 hex characters. The client
  // sent something wrong, so this is a 400. Without this branch it falls
  // through to the 500 below, which would be us blaming ourselves for their
  // typo.
  if (err instanceof mongoose.Error.CastError) {
    return {
      status: 400,
      code: "INVALID_ID",
      message: `"${String(err.value)}" is not a valid ${err.path}`,
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
