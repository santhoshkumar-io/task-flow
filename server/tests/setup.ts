import { MongoMemoryServer } from "mongodb-memory-server";
import { afterAll, beforeAll } from "vitest";
import { connectDb, disconnectDb } from "../src/config/db.js";

// A real MongoDB that runs in this computer's memory, is used by the tests, and
// is thrown away afterwards. Tests never touch the real database and the
// machine running them needs nothing installed.
let memoryServer: MongoMemoryServer;

beforeAll(async () => {
  memoryServer = await MongoMemoryServer.create();
  const uri = memoryServer.getUri("taskflow-test");

  // So a test that needs to reconnect can find its way back.
  process.env.MONGODB_URI = uri;

  await connectDb(uri);
});

afterAll(async () => {
  await disconnectDb();
  await memoryServer.stop();
});
