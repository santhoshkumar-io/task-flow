import { MongoMemoryServer } from "mongodb-memory-server";

// The API, running on a database that exists only for the length of one
// end-to-end run and is thrown away afterwards.
//
// WHY THIS FILE EXISTS AT ALL: `npm run seed` deletes every user, task, comment
// and activity row in whatever database MONGODB_URI names. Pointing Playwright
// at the development database would mean wiping it on every run. This starts a
// MongoDB of its own instead, so the tests cannot reach anything real.
//
// NODE_ENV=test is doing two separate jobs here, and both are load-bearing:
//
//   1. config/env.ts skips loading server/.env when NODE_ENV is "test". So this
//      process never even reads the Atlas connection string. That is the
//      guarantee — not care, not convention.
//   2. middleware/rateLimit.ts turns the limiter off. Without it the sixth
//      sign-in inside fifteen minutes gets a 429 and the suite fails for a
//      reason that has nothing to do with the code under test.
//
// The imports below are DYNAMIC on purpose. config/env.ts validates the
// environment at import time, so every value has to be in process.env before
// anything that reads it is loaded. A static import at the top of this file
// would run env.ts first and this script would die on the missing MONGODB_URI.

const PORT = 4000;
const WEB_ORIGIN = "http://localhost:5173";

async function main() {
  console.log("e2e: starting a throwaway MongoDB…");
  const mongo = await MongoMemoryServer.create();
  const uri = mongo.getUri("taskflow-e2e");

  process.env.NODE_ENV = "test";
  process.env.MONGODB_URI = uri;
  process.env.PORT = String(PORT);
  process.env.CORS_ORIGIN = WEB_ORIGIN;
  process.env.APP_URL = WEB_ORIGIN;
  // Not a secret: this database is deleted when the process exits, and the
  // JWTs signed with it are worthless the moment it does. It only has to be
  // long enough to satisfy the 32-character rule in config/env.ts.
  process.env.JWT_SECRET = "e2e-only-secret-not-used-anywhere-else-32+";

  const [{ connectDb, disconnectDb }, { seedData }, { createApp }] =
    await Promise.all([
      import("./config/db.js"),
      import("./seed.js"),
      import("./app.js"),
    ]);

  await connectDb(uri);
  await seedData();

  const server = createApp().listen(PORT, () => {
    console.log(`e2e: API listening on ${PORT}, seeded, using an in-memory database`);
  });

  // Playwright sends SIGTERM when the run finishes. Close in order — stop
  // accepting requests, drop the connection, then stop the database — so the
  // temporary files are actually cleaned up rather than left behind.
  const stop = async () => {
    server.close();
    await disconnectDb();
    await mongo.stop();
    process.exit(0);
  };

  for (const signal of ["SIGINT", "SIGTERM"] as const) {
    process.on(signal, () => void stop());
  }
}

main().catch((error) => {
  console.error("e2e: could not start", error);
  process.exit(1);
});
