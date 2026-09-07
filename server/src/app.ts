import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import { env } from "./config/env.js";
import { isDbConnected } from "./config/db.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";
import { buildRateLimiters, type RateLimitOptions } from "./middleware/rateLimit.js";
import { requestId } from "./middleware/requestId.js";
import { authRouter } from "./modules/auth/auth.routes.js";
import { taskRouter } from "./modules/tasks/task.routes.js";
import { usersRouter } from "./modules/users/users.routes.js";

// Builds the Express app and deliberately never calls listen(). Tests import
// this and send requests straight to it, with no real network port involved.
// index.ts is the only place that listens.

export interface AppOptions {
  /**
   * Only the rate limits, and only so a test can build an app with a limit of 2
   * and watch it fire. Everything else comes from the environment — an app
   * whose behaviour depends on how it was constructed is one the tests can pass
   * without the real thing working.
   */
  rateLimit?: RateLimitOptions;
}

export function createApp(options: AppOptions = {}) {
  const app = express();
  const { authLimiter, apiLimiter } = buildRateLimiters(options.rateLimit);

  // How far back to look for the caller's real address. See TRUST_PROXY_HOPS
  // in config/env.ts — with this unset behind a proxy, every request appears
  // to come from the balancer and the login limiter counts the whole world
  // in one bucket.
  //
  // A number rather than `true`: `true` trusts the entire forwarded-for
  // chain, which anyone can extend by sending the header themselves, and
  // express-rate-limit refuses to run with it for exactly that reason.
  if (env.TRUST_PROXY_HOPS > 0) {
    app.set("trust proxy", env.TRUST_PROXY_HOPS);
  }

  // A dozen protective response headers in one line, before anything else — a
  // request that never reaches a route still needs them.
  //
  // The two that matter most here: X-Content-Type-Options: nosniff stops the
  // browser guessing a response's type and running it as script, and the frame
  // headers stop this app being loaded invisibly inside somebody else's page
  // with their buttons over the top.
  app.use(helmet());

  // FIRST, before anything that can fail. A request that is rejected by CORS
  // or dies on a malformed body still needs an id, because those are exactly
  // the failures somebody will ask about.
  app.use(requestId);

  // Brought forward from V10 because nothing else here works without it: the
  // browser refuses a cross-origin request from :5173 to :4000 otherwise.
  // The origin is named exactly and never "*" — with credentials involved the
  // browser rejects a wildcard outright. See docs/decisions/0001-token-storage.md.
  app.use(
    cors({
      origin: env.CORS_ORIGIN,
      credentials: true,
      // Without this line the header is sent but the BROWSER hides it from
      // JavaScript. Cross-origin, fetch can only read a short safelist of
      // response headers, and x-request-id is not on it — so
      // response.headers.get("x-request-id") would be null on the page while
      // curl showed the header perfectly. Naming it here lifts that block.
      exposedHeaders: ["x-request-id"],
    }),
  );

  // Express buffers the WHOLE body in memory before parsing it, so without a
  // cap a handful of large requests can take the process's memory. 100kb is
  // Express's own default — written down rather than left implied, because a
  // limit nobody can see is a limit nobody knows they are relying on. The
  // largest thing this API accepts is a 5000 character description.
  app.use(express.json({ limit: "100kb" }));

  // The login pass arrives in a cookie the page cannot read. Express 5 does not
  // parse cookies on its own, so this is what puts them on req.cookies.
  app.use(cookieParser());

  // Kept from V0 so `curl localhost:4000` still answers.
  app.get("/", (_req, res) => {
    res.json({ ok: true });
  });

  app.get("/api/health", (_req, res) => {
    const connected = isDbConnected();
    res.json({
      status: connected ? "ok" : "degraded",
      db: connected ? "connected" : "disconnected",
    });
  });

  // The loose limit covers everything under /api. Registered BEFORE the strict
  // one below, so a flood of login attempts is counted by both — the strict
  // limit is an extra rule on top of the general one, not a replacement for it.
  app.use("/api", apiLimiter);

  // The strict limit, on the two routes where a wrong guess costs the attacker
  // nothing. Not on the whole auth router: /logout and /me are ordinary
  // requests a real person makes repeatedly, and rate limiting /me would
  // throttle the app's own startup check.
  app.use("/api/auth/login", authLimiter);
  app.use("/api/auth/register", authLimiter);

  // Password reset belongs on the strict limiter too, for two separate
  // reasons: asking for a reset sends mail to somebody else's address, and
  // trying tokens is guessing.
  app.use("/api/auth/forgot-password", authLimiter);
  app.use("/api/auth/reset-password", authLimiter);
  app.use("/api/auth/accept-invite", authLimiter);

  // Inviting sends mail to somebody else's address, which is the same reason
  // forgot-password is here rather than on the loose limit.
  app.use("/api/users/invite", authLimiter);

  app.use("/api/auth", authRouter);
  app.use("/api/users", usersRouter);
  app.use("/api/tasks", taskRouter);

  // Order below this line is the whole point. Anything registered after an
  // error handler can never reach it, so these two are always last, and the
  // error handler is always last of all.
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
