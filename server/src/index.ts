// First line on purpose: reading the settings is the first thing that can fail,
// and it should fail before anything else has started.
import { env } from "./config/env.js";
import { connectDb, disconnectDb } from "./config/db.js";
import { createApp } from "./app.js";

async function start() {
  await connectDb(env.MONGODB_URI);

  const app = createApp();
  const server = app.listen(env.PORT, () => {
    console.log(`listening on ${env.PORT}`);
  });

  // Ctrl+C and container stop signals. Close the port first so no new request
  // arrives, then hand the database connection back cleanly.
  for (const signal of ["SIGINT", "SIGTERM"] as const) {
    process.on(signal, () => {
      console.log(`\n${signal} received, shutting down`);
      server.close(() => {
        void disconnectDb().then(() => process.exit(0));
      });
    });
  }
}

void start();
