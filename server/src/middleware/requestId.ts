import { randomBytes } from "node:crypto";
import type { NextFunction, Request, Response } from "express";

// Gives every request a short id, puts it on the reply as x-request-id, and
// keeps it on req so the error handler can put it in the body too.
//
// The point is joining two things up. When a user says "it broke", the screen
// shows `Request ID: b1f2fc4 · 500 from /api/tasks` and the same b1f2fc4 is in
// the server log, so that exact failure is one search away instead of a guess
// through everything that happened around that time.
//
// Seven hex characters, not a full UUID. It only has to be unique among the
// requests in a log file, and it has to be short enough that somebody can read
// it off a screen and type it into a chat message. A 36-character UUID is
// neither.

declare module "express-serve-static-core" {
  interface Request {
    /** Set by requestId(), read by the error handler. */
    id?: string;
  }
}

export function requestId(req: Request, res: Response, next: NextFunction) {
  // A caller may already have one — a load balancer or another service that
  // started this chain. Reusing theirs is what makes the id traceable across
  // hops rather than restarting at every service.
  const incoming = req.get("x-request-id");

  const id =
    incoming && isSafe(incoming) ? incoming : randomBytes(4).toString("hex").slice(0, 7);

  req.id = id;
  res.setHeader("x-request-id", id);

  next();
}

// An id from outside is untrusted input and ends up in a response header and a
// log line. Anything but plain short alphanumerics is thrown away and replaced
// with our own, so a header cannot be used to inject into either.
function isSafe(value: string): boolean {
  return /^[A-Za-z0-9-]{1,64}$/.test(value);
}
