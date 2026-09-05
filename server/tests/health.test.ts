import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { connectDb, disconnectDb } from "../src/config/db.js";

const app = createApp();

describe("GET /api/health", () => {
  it("returns 200 and reports the database as connected", async () => {
    const response = await request(app).get("/api/health");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: "ok", db: "connected" });
  });
});

describe("unknown routes", () => {
  it("answers with the standard error shape, not an HTML page", async () => {
    const response = await request(app).get("/api/does-not-exist");

    expect(response.status).toBe(404);
    expect(response.headers["content-type"]).toMatch(/application\/json/);
    expect(response.body.error.code).toBe("NOT_FOUND");
    expect(response.body.error.message).toContain("/api/does-not-exist");
  });
});

describe("a malformed JSON body", () => {
  it("is rejected with 400 in the standard shape", async () => {
    const response = await request(app)
      .post("/api/health")
      .set("Content-Type", "application/json")
      .send("{ not json");

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("INVALID_JSON");
  });
});

describe("GET /api/health with the database unreachable", () => {
  // Proves the other half of the health check. Pulling the connection down and
  // putting it back is the only honest way to see the "disconnected" answer.
  beforeAll(async () => {
    await disconnectDb();
  });

  afterAll(async () => {
    await connectDb(process.env.MONGODB_URI as string);
  });

  it("still answers 200, but reports the database as disconnected", async () => {
    const response = await request(app).get("/api/health");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: "degraded", db: "disconnected" });
  });
});
