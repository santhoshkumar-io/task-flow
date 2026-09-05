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

describe("the request id", () => {
  it("is on every reply, even a successful one", async () => {
    const response = await request(app).get("/api/health");

    expect(response.headers["x-request-id"]).toMatch(/^[0-9a-f]{7}$/);
  });

  it("is different on two separate requests", async () => {
    const [first, second] = await Promise.all([
      request(app).get("/api/health"),
      request(app).get("/api/health"),
    ]);

    expect(first.headers["x-request-id"]).not.toBe(
      second.headers["x-request-id"],
    );
  });

  it("appears in the error body AND matches the header", async () => {
    // The design's error line reads "Request ID: b1f2fc4 · 500 from
    // /api/tasks". Two copies of one value is only useful if they agree.
    const response = await request(app).get("/api/does-not-exist");

    expect(response.body.error.requestId).toBe(
      response.headers["x-request-id"],
    );
  });

  it("reuses an id the caller sent, so a trace survives across services", async () => {
    const response = await request(app)
      .get("/api/health")
      .set("x-request-id", "abc123");

    expect(response.headers["x-request-id"]).toBe("abc123");
  });

  it("throws away a caller id that is not plain alphanumerics", async () => {
    // An id from outside is untrusted and ends up in a response header. This
    // one carries a CRLF, the classic header-injection payload.
    const response = await request(app)
      .get("/api/health")
      .set("x-request-id", "bad value: injected");

    expect(response.headers["x-request-id"]).toMatch(/^[0-9a-f]{7}$/);
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
