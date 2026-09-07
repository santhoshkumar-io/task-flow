import rateLimit from "express-rate-limit";
import type { RequestHandler } from "express";
import { env } from "../config/env.js";
import { AppError } from "../lib/AppError.js";

// Counting requests and refusing a flood.
//
// Two limits, because they stop two different things:
//
//   strict  — login and register. This is where password guessing happens, and
//             a wrong guess costs the attacker nothing. Five in fifteen minutes
//             makes a guessing attack useless while never touching a real
//             person: nobody mistypes their own password five times in a
//             quarter of an hour and then a sixth.
//
//   loose   — everything else. This is for abuse, not guessing. One screen of
//             the task list is already several requests, so a limit a real
//             person can reach is a bug, not a guard.
//
// Both count per address and keep the count in this process's memory. That is
// the honest limitation: two copies of the server would each allow the full
// amount, and a restart forgets everything. Fixing it means a shared store
// (Redis), which is a piece of infrastructure this project does not have.
// Written down in docs/notes/v10.md rather than pretended away.

export interface RateLimitOptions {
  /** Requests per window on login and register. */
  authMax?: number;
  /** Requests per window everywhere else under /api. */
  apiMax?: number;
  windowMinutes?: number;
  /**
   * Off entirely. The default under NODE_ENV=test, because every supertest
   * request arrives from the same address — a shared five-per-window bucket
   * would fail the suite on its sixth login rather than testing anything.
   * The rate-limit tests build their own app with real limits of 2.
   */
  disabled?: boolean;
}

/** Nothing at all, so the caller does not have to branch on `disabled`. */
const passThrough: RequestHandler = (_req, _res, next) => next();

export function buildRateLimiters(options: RateLimitOptions = {}) {
  const {
    authMax = env.RATE_LIMIT_AUTH_MAX,
    apiMax = env.RATE_LIMIT_API_MAX,
    windowMinutes = env.RATE_LIMIT_WINDOW_MINUTES,
    disabled = env.NODE_ENV === "test",
  } = options;

  if (disabled) {
    return { authLimiter: passThrough, apiLimiter: passThrough };
  }

  const windowMs = windowMinutes * 60 * 1000;

  return {
    authLimiter: make(windowMs, authMax, "Too many attempts. Try again later."),
    apiLimiter: make(windowMs, apiMax, "Too many requests. Slow down."),
  };
}

function make(windowMs: number, max: number, message: string): RequestHandler {
  return rateLimit({
    windowMs,
    limit: max,

    // Sends RateLimit-* on every response, so a client can see how close it is
    // rather than discovering the limit by hitting it. The older
    // X-RateLimit-* headers are off — two sets of headers saying the same thing
    // is noise.
    standardHeaders: "draft-7",
    legacyHeaders: false,

    // Handed to the normal error handler instead of writing its own response.
    // Every other failure in this API is { error: { code, message, requestId } }
    // and a 429 that broke that shape would be one the frontend cannot read —
    // ErrorState pulls the request id out of exactly that field.
    handler: (_req, _res, next) => {
      next(new AppError(429, "TOO_MANY_REQUESTS", message));
    },
  });
}
