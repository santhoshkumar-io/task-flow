import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import { env } from "./config/env.js";
import { isDbConnected } from "./config/db.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";
import { authRouter } from "./modules/auth/auth.routes.js";
import { taskRouter } from "./modules/tasks/task.routes.js";
import { usersRouter } from "./modules/users/users.routes.js";

// Builds the Express app and deliberately never calls listen(). Tests import
// this and send requests straight to it, with no real network port involved.
// index.ts is the only place that listens.

export function createApp() {
  const app = express();

  // Brought forward from V10 because nothing else here works without it: the
  // browser refuses a cross-origin request from :5173 to :4000 otherwise.
  // The origin is named exactly and never "*" — with credentials involved the
  // browser rejects a wildcard outright. See docs/decisions/0001-token-storage.md.
  app.use(
    cors({
      origin: env.CORS_ORIGIN,
      credentials: true,
    }),
  );

  app.use(express.json());

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
