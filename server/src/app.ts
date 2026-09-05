import express from "express";
import { isDbConnected } from "./config/db.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";

// Builds the Express app and deliberately never calls listen(). Tests import
// this and send requests straight to it, with no real network port involved.
// index.ts is the only place that listens.

export function createApp() {
  const app = express();

  app.use(express.json());

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

  // Order below this line is the whole point. Anything registered after an
  // error handler can never reach it, so these two are always last, and the
  // error handler is always last of all.
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
